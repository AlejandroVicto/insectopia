package com.insectopia.services;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.dtos.mensajes.ConversacionResponseDTO;
import com.insectopia.dtos.mensajes.SeguidoResponseDTO;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Conversacion;
import com.insectopia.models.ParticipanteConversacion;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.models.ids.ParticipanteConversacionId;
import com.insectopia.repository.ConversacionRepository;
import com.insectopia.repository.ParticipanteConversacionRepository;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;

/**
 * Actividad 066: seguidos, apertura/recuperación de chats directos y
 * ocultamiento por participante. La identidad siempre sale del JWT; el cuerpo
 * solo puede elegir al destinatario.
 */
@Service
public class GestionConversacionesService {

    private static final int BUSQUEDA_MAX = 100;
    private static final String PREFIJO_CLAVE = "directa:";

    private final TransactionTemplate transacciones;
    private final ConversacionRepository conversaciones;
    private final ParticipanteConversacionRepository participantes;
    private final SeguidorRepository seguidores;
    private final UsuarioRepository usuarios;
    private final MensajesService mensajes;

    public GestionConversacionesService(
            TransactionTemplate transacciones,
            ConversacionRepository conversaciones,
            ParticipanteConversacionRepository participantes,
            SeguidorRepository seguidores,
            UsuarioRepository usuarios,
            MensajesService mensajes) {
        this.transacciones = transacciones;
        this.conversaciones = conversaciones;
        this.participantes = participantes;
        this.seguidores = seguidores;
        this.usuarios = usuarios;
        this.mensajes = mensajes;
    }

    /** DTO devuelto al abrir: {@code creada} decide entre HTTP 201 y 200. */
    public record ResultadoAbrir(ConversacionResponseDTO conversacion, boolean creada) {
    }

    /** Lista de seguidos del JWT; el filtro y la paginación se hacen en MySQL. */
    @Transactional(readOnly = true)
    public Page<SeguidoResponseDTO> listarSeguidos(
            int page, int size, String q, InsectopiaUserDetails principal) {
        return seguidores
                .buscarSeguidos(
                        principal.idUsuario(),
                        patronBusqueda(q),
                        EstadoUsuario.ACTIVO,
                        PageRequest.of(page, size))
                .map(relacion -> SeguidoResponseDTO.from(relacion.getSeguido()));
    }

    /**
     * Abre o recupera una conversación directa. Solo exige seguimiento cuando
     * va a crear una conversación nueva; las existentes se reutilizan aunque
     * el usuario haya dejado de seguir a su interlocutor.
     */
    public ResultadoAbrir abrir(Long destinatarioId, InsectopiaUserDetails principal) {
        if (destinatarioId == null || destinatarioId <= 0) {
            throw new RegistrationValidationException(
                    "destinatarioId", "El destinatario debe ser válido");
        }
        Long idSolicitante = principal.idUsuario();
        if (idSolicitante == null) {
            throw new AccessDeniedException("Sesión inválida");
        }
        if (destinatarioId.equals(idSolicitante)) {
            throw new RegistrationValidationException(
                    "destinatarioId", "No puedes iniciar una conversación contigo mismo");
        }

        Usuario solicitante = usuarios.findById(idSolicitante)
                .orElseThrow(() -> new ResourceNotFoundException("usuario", idSolicitante));
        Usuario destinatario = usuarios.findById(destinatarioId)
                .orElseThrow(() -> new ResourceNotFoundException("usuario", destinatarioId));
        if (destinatario.getEstado() != EstadoUsuario.ACTIVO) {
            throw new ResourceNotFoundException("usuario", destinatarioId);
        }

        String clave = claveDirecta(idSolicitante, destinatarioId);
        try {
            return transacciones.execute(estado ->
                    abrirEnTransaccion(clave, solicitante, destinatario, principal));
        } catch (DataIntegrityViolationException conflicto) {
            // Otra petición ganó la carrera por clave_directa: su transacción ya
            // hizo rollback o commit. Se busca en una transacción limpia.
            return transacciones.execute(estado ->
                    reutilizarTrasConflicto(clave, idSolicitante, destinatarioId, principal));
        }
    }

    /** Oculta la conversación únicamente para el usuario autenticado. */
    @Transactional
    public void ocultar(Long idConversacion, InsectopiaUserDetails principal) {
        if (idConversacion == null || !conversaciones.existsById(idConversacion)) {
            throw new ResourceNotFoundException("conversación", idConversacion);
        }
        ParticipanteConversacion propia = participantes
                .findByConversacion_IdConversacionAndUsuario_IdUsuario(
                        idConversacion, principal.idUsuario())
                .orElseThrow(() -> new AccessDeniedException(
                        "No tienes acceso a esta conversación"));
        propia.setOculta(Boolean.TRUE);
        participantes.save(propia);
    }

    private ResultadoAbrir abrirEnTransaccion(
            String clave, Usuario solicitante, Usuario destinatario,
            InsectopiaUserDetails principal) {
        Long idSolicitante = solicitante.getIdUsuario();
        Long idDestinatario = destinatario.getIdUsuario();

        Optional<Conversacion> existente = conversaciones.findByClaveDirecta(clave);
        if (existente.isEmpty()) {
            existente = encontrarPorParticipantes(idSolicitante, idDestinatario).stream()
                    .findFirst();
        }
        if (existente.isPresent()) {
            return reutilizar(existente.get(), idSolicitante, idDestinatario, principal, false);
        }

        if (!seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(
                idSolicitante, idDestinatario)) {
            throw new AccessDeniedException(
                    "Solo puedes iniciar una conversación con personas que sigues");
        }

        Conversacion creada = new Conversacion();
        creada.setClaveDirecta(clave);
        creada.setFechaCreacion(LocalDateTime.now());
        conversaciones.saveAndFlush(creada);
        crearParticipante(creada, solicitante);
        crearParticipante(creada, destinatario);

        return reutilizar(creada, idSolicitante, idDestinatario, principal, true);
    }

    private ResultadoAbrir reutilizarTrasConflicto(
            String clave, Long idSolicitante, Long idDestinatario,
            InsectopiaUserDetails principal) {
        Optional<Conversacion> existente = conversaciones.findByClaveDirecta(clave);
        if (existente.isEmpty()) {
            existente = encontrarPorParticipantes(idSolicitante, idDestinatario).stream()
                    .findFirst();
        }
        Conversacion ganadora = existente.orElseThrow(() -> new DuplicateResourceException(
                "claveDirecta", "No se pudo resolver la conversación directa"));
        return reutilizar(ganadora, idSolicitante, idDestinatario, principal, false);
    }

    private ResultadoAbrir reutilizar(
            Conversacion conversacion, Long idSolicitante, Long idDestinatario,
            InsectopiaUserDetails principal, boolean creada) {
        Long idConversacion = conversacion.getIdConversacion();
        List<ParticipanteConversacion> filas =
                participantes.findConUsuariosPorConversaciones(List.of(idConversacion));
        Set<Long> idsParticipantes = new HashSet<>();
        for (ParticipanteConversacion fila : filas) {
            if (fila.getUsuario() != null && fila.getUsuario().getIdUsuario() != null) {
                idsParticipantes.add(fila.getUsuario().getIdUsuario());
            }
        }
        boolean participantesCorrectos = idsParticipantes.contains(idSolicitante)
                && idsParticipantes.contains(idDestinatario)
                && participantes.countByConversacion_IdConversacion(idConversacion) == 2L;
        if (!participantesCorrectos) {
            throw new DuplicateResourceException(
                    "claveDirecta", "La conversación directa no tiene dos participantes válidos");
        }

        filas.stream()
                .filter(fila -> idSolicitante.equals(fila.getUsuario().getIdUsuario())
                        && Boolean.TRUE.equals(fila.getOculta()))
                .forEach(fila -> {
                    fila.setOculta(Boolean.FALSE);
                    participantes.save(fila);
                });

        return new ResultadoAbrir(
                mensajes.conversacionPorId(idConversacion, principal), creada);
    }

    private List<Conversacion> encontrarPorParticipantes(Long idUno, Long idDos) {
        return participantes.findDirectasPorParticipantes(idUno, idDos, List.of(idUno, idDos));
    }

    private void crearParticipante(Conversacion conversacion, Usuario usuario) {
        ParticipanteConversacion participante = new ParticipanteConversacion();
        participante.setId(new ParticipanteConversacionId(
                conversacion.getIdConversacion(), usuario.getIdUsuario()));
        participante.setConversacion(conversacion);
        participante.setUsuario(usuario);
        participante.setFechaIngreso(LocalDateTime.now());
        participante.setOculta(Boolean.FALSE);
        participantes.saveAndFlush(participante);
    }

    private static String claveDirecta(Long idUno, Long idDos) {
        long menor = Math.min(idUno, idDos);
        long mayor = Math.max(idUno, idDos);
        return PREFIJO_CLAVE + menor + ":" + mayor;
    }

    private static String patronBusqueda(String q) {
        if (q == null || q.isBlank()) {
            return null;
        }
        String texto = q.trim();
        if (texto.length() > BUSQUEDA_MAX) {
            texto = texto.substring(0, BUSQUEDA_MAX);
        }
        return "%" + texto.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_") + "%";
    }
}
