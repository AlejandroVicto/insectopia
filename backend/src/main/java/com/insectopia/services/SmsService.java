package com.insectopia.services;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.twilio.exception.ApiException;

/** SMS demo: sin outbox. Una caída del proceso pierde los envíos/reintentos pendientes. */
@Service
public class SmsService {
    private static final Logger LOG = LoggerFactory.getLogger(SmsService.class);
    private static final int MAX_INTENTOS = 3;
    private static final Pattern SID = Pattern.compile("SM[0-9a-fA-F]{32}");
    private final JdbcTemplate jdbc;
    private final SmsSettings settings;
    private final SmsGateway gateway;
    private final TaskScheduler scheduler;
    private final ConcurrentMap<Inscripcion, UUID> pendientes = new ConcurrentHashMap<>();

    public SmsService(JdbcTemplate jdbc, SmsSettings settings, SmsGateway gateway,
            @Qualifier("smsTaskScheduler") TaskScheduler scheduler) {
        this.jdbc = jdbc;
        this.settings = settings;
        this.gateway = gateway;
        this.scheduler = scheduler;
    }

    /** Registrar sólo una inscripción nueva, dentro de su transacción. No hace llamadas de red. */
    public void registrar(Long evento, Long usuario, boolean consentimiento) {
        if (!settings.enabled() || !consentimiento) return;
        trasCommit(() -> {
            Inscripcion clave = new Inscripcion(evento, usuario);
            UUID version = UUID.randomUUID();
            pendientes.put(clave, version);
            programar(clave, version, 1, 0);
        });
    }

    /** Una cancelación confirmada invalida los reintentos de la inscripción anterior. */
    public void cancelar(Long evento, Long usuario) {
        if (!settings.enabled()) return;
        trasCommit(() -> pendientes.remove(new Inscripcion(evento, usuario)));
    }

    private void trasCommit(Runnable tarea) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("SMS requiere una transacción de inscripción");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                try { tarea.run(); }
                catch (RuntimeException error) {
                    // Fallos de programación nunca cambian una inscripción ya confirmada.
                    LOG.warn("SMS: fallo local etapa=afterCommit tipo={} SID recibido=no", error.getClass().getSimpleName());
                }
            }
        });
    }

    private void programar(Inscripcion clave, UUID version, int intento, long segundos) {
        try {
            scheduler.schedule(() -> intentar(clave, version, intento), Instant.now().plusSeconds(segundos));
        } catch (RuntimeException error) {
            pendientes.remove(clave, version);
            LOG.warn("SMS evento {}: fallo local etapa=programar tipo={} SID recibido=no",
                    clave.evento(), error.getClass().getSimpleName());
        }
    }

    private void intentar(Inscripcion clave, UUID version, int intento) {
        if (!version.equals(pendientes.get(clave))) return;
        // Consulta terminada ANTES de la llamada HTTP: no hay transacción abierta durante Twilio.
        Candidato destinatario;
        try {
            var candidatos = jdbc.query("SELECT u.telefono, u.recibir_sms, u.estado AS usuario_estado, "
                    + "e.estado AS evento_estado, e.titulo, p.estado AS participacion_estado "
                    + "FROM participantes_evento p JOIN usuarios u ON u.id_usuario = p.id_usuario "
                    + "JOIN eventos e ON e.id_evento = p.id_evento "
                    + "WHERE p.id_evento = ? AND p.id_usuario = ?",
                    (rs, row) -> new Candidato(rs.getString("telefono"), rs.getBoolean("recibir_sms"),
                            rs.getString("usuario_estado"), rs.getString("evento_estado"),
                            rs.getString("participacion_estado"), rs.getString("titulo")),
                    clave.evento(), clave.usuario());
            destinatario = candidatos.isEmpty() ? null : candidatos.getFirst();
        } catch (RuntimeException error) {
            pendientes.remove(clave, version);
            LOG.warn("SMS evento {}: fallo local etapa=consultar elegibilidad tipo={} SID recibido=no",
                    clave.evento(), error.getClass().getSimpleName());
            return;
        }
        if (!version.equals(pendientes.get(clave))) return;
        if (destinatario == null || !destinatario.consentimiento()
                || !"ACTIVO".equals(destinatario.usuarioEstado())
                || !"APROBADO".equals(destinatario.eventoEstado())
                || !"INSCRITO".equals(destinatario.participacionEstado())) {
            pendientes.remove(clave, version);
            LOG.info("SMS evento {}: validación local etapa=elegibilidad; omitido; SID recibido=no", clave.evento());
            return;
        }
        if (!SmsSettings.e164(destinatario.telefono())) {
            pendientes.remove(clave, version);
            LOG.info("SMS evento {}: validación local etapa=teléfono del perfil E.164; omitido; SID recibido=no",
                    clave.evento());
            return;
        }
        if (!settings.allowedRecipients().contains(destinatario.telefono())) {
            pendientes.remove(clave, version);
            LOG.info("SMS evento {}: validación local etapa=destinatario no autorizado; omitido; SID recibido=no",
                    clave.evento());
            return;
        }
        try {
            String sid = gateway.enviar(destinatario.telefono(), settings.from(), mensaje(destinatario.titulo()));
            pendientes.remove(clave, version);
            if (sid != null && SID.matcher(sid).matches()) LOG.info("SMS evento {}: aceptado, SID {}", clave.evento(), sid);
            else LOG.warn("SMS evento {}: respuesta incierta etapa=Message.create SID recibido={}; sin reintento",
                    clave.evento(), sid != null);
        } catch (ApiException error) {
            Integer http = error.getHttpStatusCode() != null ? error.getHttpStatusCode() : error.getStatusCode();
            Integer codigo = error.getCode();
            String categoria = categoria(error, http);
            if (Integer.valueOf(429).equals(http) && intento < MAX_INTENTOS
                    && version.equals(pendientes.get(clave))) {
                LOG.warn("SMS evento {}: {} etapa=Message.create HTTP={} código Twilio={} tipo={} SID recibido=no; reintento {} de {}",
                        clave.evento(), categoria, http, codigo, error.getClass().getSimpleName(), intento + 1, MAX_INTENTOS);
                programar(clave, version, intento + 1, 30L * (1L << (intento - 1)));
            } else {
                pendientes.remove(clave, version);
                LOG.warn("SMS evento {}: {} etapa=Message.create HTTP={} código Twilio={} tipo={} SID recibido=no; sin reintento",
                        clave.evento(), categoria, http, codigo, error.getClass().getSimpleName());
            }
        } catch (RuntimeException error) {
            pendientes.remove(clave, version);
            // Timeouts/errores de transporte pueden significar envío aceptado. Nunca reintentarlos.
            LOG.warn("SMS evento {}: error de red o respuesta incierta etapa=construir/enviar solicitud Twilio tipo={} SID recibido=no; sin reintento",
                    clave.evento(), error.getClass().getSimpleName());
        }
    }

    private static String categoria(ApiException error, Integer http) {
        Integer codigo = error.getCode();
        if (Integer.valueOf(21606).equals(codigo) || Integer.valueOf(21659).equals(codigo))
            return "remitente no autorizado";
        if (Integer.valueOf(21608).equals(codigo) || Integer.valueOf(21408).equals(codigo)
                || Integer.valueOf(21610).equals(codigo)) return "destinatario no permitido";
        if (Integer.valueOf(20003).equals(codigo) || Integer.valueOf(401).equals(http)
                || Integer.valueOf(403).equals(http)) return "error de autenticación o permisos";
        return "rechazo de la API de Twilio";
    }

    static String mensaje(String titulo) {
        String limpio = titulo == null ? "" : titulo.replaceAll("[\\p{Cc}\\p{Cf}\\p{Z}]+", " ")
                .replaceAll("\\s+", " ").trim();
        int limite = Math.min(limpio.length(), 80);
        if (limite > 0 && Character.isHighSurrogate(limpio.charAt(limite - 1))) limite--;
        return "Insectopia: Tu inscripcion al evento [" + limpio.substring(0, limite)
                + "] fue confirmada.";
    }

    private record Inscripcion(Long evento, Long usuario) { }
    private record Candidato(String telefono, boolean consentimiento, String usuarioEstado,
            String eventoEstado, String participacionEstado, String titulo) { }
}
