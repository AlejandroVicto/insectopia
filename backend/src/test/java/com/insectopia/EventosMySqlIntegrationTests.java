package com.insectopia;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.exceptions.EventoConflictoException;
import com.insectopia.models.Evento;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.models.enums.EstadoParticipanteEvento;
import com.insectopia.models.ids.ParticipanteEventoId;
import com.insectopia.repository.*;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.EventoService;

/** Ejecución opt-in; jamás conecta Flyway ni escribe en la base de desarrollo. */
@EnabledIfEnvironmentVariable(named = "DB_NAME", matches = "insectopia_test")
@SpringBootTest
class EventosMySqlIntegrationTests {
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        if (!"insectopia_test".equals(System.getenv("DB_NAME"))) {
            throw new IllegalStateException("DB_NAME debe ser insectopia_test");
        }
        registry.add("spring.datasource.url", () -> "jdbc:mysql://" + System.getenv().getOrDefault("DB_HOST", "localhost")
                + ":" + System.getenv().getOrDefault("DB_PORT", "3306") + "/insectopia_test");
        registry.add("spring.datasource.username", () -> required("DB_USER"));
        registry.add("spring.datasource.password", () -> required("DB_PASSWORD"));
    }

    private static String required(String clave) {
        String valor = System.getenv(clave);
        if (valor == null || valor.isBlank()) throw new IllegalStateException("Falta " + clave);
        return valor;
    }

    @Autowired TransactionTemplate transacciones;
    @Autowired JdbcTemplate jdbc;
    @Autowired RolRepository roles;
    @Autowired UsuarioRepository usuarios;
    @Autowired EventoRepository eventos;
    @Autowired ParticipanteEventoRepository participantes;
    @Autowired NotificacionRepository notificaciones;
    @Autowired EventoService service;

    private Usuario usuario(String nombre) {
        Usuario usuario = new Usuario();
        usuario.setRol(roles.findByNombre("USUARIO").orElseThrow());
        usuario.setNombre(nombre);
        usuario.setNombreUsuario(nombre);
        usuario.setCorreo(nombre + "@example.invalid");
        usuario.setContrasena("hash");
        usuario.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        usuario.setPaisCodigo("MX");
        usuario.setEstadoRegion("Oaxaca");
        return usuarios.saveAndFlush(usuario);
    }

    private static InsectopiaUserDetails principal(Usuario usuario) {
        return new InsectopiaUserDetails(usuario.getIdUsuario(), usuario.getCorreo(), "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
    }

    @Test void esquemaExistenteYUltimoCupoConcurrenteSinAvisosDuplicados() throws Exception {
        assertEquals(Set.of("id_evento", "id_usuario", "fecha_inscripcion", "estado", "fecha_cancelacion"),
                Set.copyOf(jdbc.queryForList("select column_name from information_schema.columns "
                        + "where table_schema = database() and table_name = 'participantes_evento'", String.class)));
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        Usuario[] cuentas = new Usuario[3];
        Long id = transacciones.execute(status -> {
            cuentas[0] = usuario("evtpro" + sufijo);
            cuentas[1] = usuario("evtuno" + sufijo);
            cuentas[2] = usuario("evtdos" + sufijo);
            Evento evento = new Evento();
            evento.setProponente(cuentas[0]);
            evento.setTitulo("Prueba cupo " + sufijo);
            evento.setDescripcion("Concurrencia de inscripciones");
            evento.setUbicacion("Oaxaca");
            evento.setFechaInicio(LocalDateTime.now(ZoneId.of("America/Mexico_City")).plusDays(10));
            evento.setFechaFin(evento.getFechaInicio().plusHours(2));
            evento.setCupoMaximo(1);
            evento.setEstado(EstadoEvento.APROBADO);
            return eventos.saveAndFlush(evento).getIdEvento();
        });
        try {
            CountDownLatch salida = new CountDownLatch(1);
            var uno = CompletableFuture.supplyAsync(() -> inscribirTrasSalida(id, cuentas[1], salida));
            var dos = CompletableFuture.supplyAsync(() -> inscribirTrasSalida(id, cuentas[2], salida));
            salida.countDown();
            List<Boolean> resultados = List.of(uno.get(20, TimeUnit.SECONDS), dos.get(20, TimeUnit.SECONDS));
            assertEquals(1, resultados.stream().filter(Boolean::booleanValue).count());
            assertEquals(1, participantes.countByEvento_IdEventoAndEstado(id, EstadoParticipanteEvento.INSCRITO));
            Usuario ganador = resultados.get(0) ? cuentas[1] : cuentas[2];
            assertEquals(1, notificaciones.findByDestinatario_IdUsuario(ganador.getIdUsuario(),
                    org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements());
            assertEquals(EstadoParticipanteEvento.INSCRITO,
                    service.misParticipaciones(0, 10, null, null, "", null, null, principal(ganador))
                            .getContent().getFirst().estadoInscripcion());
            assertThrows(EventoConflictoException.class, () -> service.inscribir(id, principal(ganador)));
            service.cancelarInscripcion(id, principal(ganador));
            assertEquals(EstadoParticipanteEvento.CANCELADO,
                    participantes.findById(new ParticipanteEventoId(id, ganador.getIdUsuario())).orElseThrow().getEstado());
            assertEquals(0, participantes.countByEvento_IdEventoAndEstado(id, EstadoParticipanteEvento.INSCRITO));
            service.inscribir(id, principal(ganador));
            assertEquals(1, participantes.findByEvento_IdEvento(id,
                    org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements());
        } finally {
            transacciones.executeWithoutResult(status -> {
                for (Usuario cuenta : cuentas) {
                    notificaciones.deleteAll(notificaciones.findByDestinatario_IdUsuario(cuenta.getIdUsuario(),
                            org.springframework.data.domain.PageRequest.of(0, 50)).getContent());
                }
                participantes.deleteAll(participantes.findByEvento_IdEvento(id,
                        org.springframework.data.domain.PageRequest.of(0, 50)).getContent());
                eventos.deleteById(id);
                for (Usuario cuenta : cuentas) usuarios.deleteById(cuenta.getIdUsuario());
            });
        }
    }

    private boolean inscribirTrasSalida(Long id, Usuario usuario, CountDownLatch salida) {
        try {
            salida.await();
            service.inscribir(id, principal(usuario));
            return true;
        } catch (EventoConflictoException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        }
    }
}
