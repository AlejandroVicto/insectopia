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
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.exceptions.EventoConflictoException;
import com.insectopia.models.Evento;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.repository.EventoRepository;
import com.insectopia.repository.NotificacionRepository;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.ModeracionService;

/** Ejecución opt-in; jamás conecta Flyway ni escribe en la base de desarrollo. */
@EnabledIfEnvironmentVariable(named = "DB_NAME", matches = "insectopia_test")
@SpringBootTest
class ModeracionMySqlIntegrationTests {
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
    @Autowired NotificacionRepository notificaciones;
    @Autowired ModeracionService service;

    private Usuario usuario(String nombre, String rol) {
        Usuario usuario = new Usuario();
        usuario.setRol(roles.findByNombre(rol).orElseThrow());
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
        String rol = usuario.getRol().getNombre();
        return new InsectopiaUserDetails(usuario.getIdUsuario(), usuario.getCorreo(), "hash", rol, 0,
                Permissions.authoritiesFor(rol));
    }

    @Test void esquemaTrazabilidadYDecisionesConcurrentesSoloUnaGanaConUnAviso() throws Exception {
        Set<String> columnas = Set.copyOf(jdbc.queryForList("select column_name from information_schema.columns "
                + "where table_schema = database() and table_name = 'eventos'", String.class));
        assertTrue(columnas.containsAll(Set.of("estado", "id_moderador", "motivo_resolucion", "fecha_resolucion")));

        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        Usuario[] cuentas = new Usuario[3];
        Long id = transacciones.execute(status -> {
            cuentas[0] = usuario("modpro" + sufijo, "USUARIO");
            cuentas[1] = usuario("moduno" + sufijo, "MODERADOR");
            cuentas[2] = usuario("moddos" + sufijo, "MODERADOR");
            Evento evento = new Evento();
            evento.setProponente(cuentas[0]);
            evento.setTitulo("Prueba moderación " + sufijo);
            evento.setDescripcion("Resolución concurrente");
            evento.setUbicacion("Oaxaca");
            evento.setFechaInicio(LocalDateTime.now(ZoneId.of("America/Mexico_City")).plusDays(10));
            evento.setFechaFin(evento.getFechaInicio().plusHours(2));
            evento.setCupoMaximo(10);
            evento.setEstado(EstadoEvento.PENDIENTE);
            return eventos.saveAndFlush(evento).getIdEvento();
        });
        try {
            CountDownLatch salida = new CountDownLatch(1);
            var aprobar = CompletableFuture.supplyAsync(
                    () -> resolverTrasSalida(id, cuentas[1], true, salida));
            var rechazar = CompletableFuture.supplyAsync(
                    () -> resolverTrasSalida(id, cuentas[2], false, salida));
            salida.countDown();
            List<Boolean> resultados = List.of(aprobar.get(20, TimeUnit.SECONDS), rechazar.get(20, TimeUnit.SECONDS));
            assertEquals(1, resultados.stream().filter(Boolean::booleanValue).count());

            Evento resuelto = eventos.findById(id).orElseThrow();
            assertNotEquals(EstadoEvento.PENDIENTE, resuelto.getEstado());
            assertNotNull(resuelto.getFechaResolucion());
            assertNotNull(resuelto.getModerador());
            assertTrue(Set.of(cuentas[1].getIdUsuario(), cuentas[2].getIdUsuario())
                    .contains(resuelto.getModerador().getIdUsuario()));
            if (resuelto.getEstado() == EstadoEvento.RECHAZADO) {
                assertEquals("Motivo de prueba", resuelto.getMotivoResolucion());
            } else {
                assertNull(resuelto.getMotivoResolucion());
            }
            assertEquals(1, notificaciones.findByDestinatario_IdUsuario(cuentas[0].getIdUsuario(),
                    PageRequest.of(0, 10)).getTotalElements());
            assertThrows(EventoConflictoException.class, () -> service.aprobar(id, principal(cuentas[1])));
            assertThrows(EventoConflictoException.class,
                    () -> service.rechazar(id, new com.insectopia.dtos.moderacion.RechazarPropuestaRequestDTO("Otro motivo"),
                            principal(cuentas[2])));
        } finally {
            transacciones.executeWithoutResult(status -> {
                for (Usuario cuenta : cuentas) {
                    notificaciones.deleteAll(notificaciones.findByDestinatario_IdUsuario(cuenta.getIdUsuario(),
                            PageRequest.of(0, 50)).getContent());
                }
                eventos.deleteById(id);
                for (Usuario cuenta : cuentas) usuarios.deleteById(cuenta.getIdUsuario());
            });
        }
    }

    private boolean resolverTrasSalida(Long id, Usuario moderador, boolean aprobar, CountDownLatch salida) {
        try {
            salida.await();
            if (aprobar) {
                service.aprobar(id, principal(moderador));
            } else {
                service.rechazar(id, new com.insectopia.dtos.moderacion.RechazarPropuestaRequestDTO("Motivo de prueba"),
                        principal(moderador));
            }
            return true;
        } catch (EventoConflictoException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        }
    }
}
