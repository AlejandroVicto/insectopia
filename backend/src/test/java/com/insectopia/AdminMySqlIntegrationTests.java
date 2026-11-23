package com.insectopia;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.dtos.RegisterRequestDTO;
import com.insectopia.dtos.admin.AdminEditarUsuarioRequestDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.AuditoriaRolRepository;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.AdminService;
import com.insectopia.services.CatalogoUbicacionesService;

/** Opt-in: sólo DB_NAME=insectopia_test. Crea únicamente cuentas temporales y las limpia. */
@EnabledIfEnvironmentVariable(named = "DB_NAME", matches = "insectopia_test")
@SpringBootTest
class AdminMySqlIntegrationTests {
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        if (!"insectopia_test".equals(System.getenv("DB_NAME"))) throw new IllegalStateException("Usa insectopia_test");
        registry.add("spring.datasource.url", () -> "jdbc:mysql://" + System.getenv().getOrDefault("DB_HOST", "localhost")
                + ":" + System.getenv().getOrDefault("DB_PORT", "3306") + "/insectopia_test");
        registry.add("spring.datasource.username", () -> required("DB_USER"));
        registry.add("spring.datasource.password", () -> required("DB_PASSWORD"));
    }
    private static String required(String key) {
        String valor = System.getenv(key);
        if (valor == null || valor.isBlank()) throw new IllegalStateException("Falta " + key);
        return valor;
    }

    @Autowired TransactionTemplate tx;
    @Autowired UsuarioRepository usuarios;
    @Autowired RolRepository roles;
    @Autowired AuditoriaRolRepository auditoria;
    @Autowired AdminService service;
    @Autowired PasswordEncoder encoder;
    @MockitoBean CatalogoUbicacionesService catalogo;

    private Usuario crear(String alias, String role) {
        Usuario user = new Usuario();
        user.setRol(roles.findByNombre(role).orElseThrow());
        user.setNombre("Prueba Administrativa");
        user.setNombreUsuario(alias);
        user.setCorreo(alias + "@example.invalid");
        user.setContrasena(encoder.encode("Segura123!"));
        user.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        user.setPaisCodigo("MX");
        user.setEstadoRegion("Oaxaca");
        return usuarios.saveAndFlush(user);
    }

    private static InsectopiaUserDetails principal(Usuario user) {
        return new InsectopiaUserDetails(user.getIdUsuario(), user.getCorreo(), user.getContrasena(),
                "ADMINISTRADOR", 0, Permissions.authoritiesFor("ADMINISTRADOR"));
    }

    @Test void consultasAltaEdicionAuditoriaRollbackYUltimoAdminConcurrente() throws Exception {
        // El test de concurrencia necesita controlar el conteo global; si el entorno ya contiene
        // otros administradores, no sería correcto manipularlos para fabricar esa condición.
        assertEquals(0, usuarios.countByRol_NombreAndEstado("ADMINISTRADOR", EstadoUsuario.ACTIVO),
                "insectopia_test debe estar libre de administradores reales para esta prueba");
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        Usuario a = tx.execute(status -> crear("adma" + sufijo, "ADMINISTRADOR"));
        Usuario b = tx.execute(status -> crear("admb" + sufijo, "ADMINISTRADOR"));
        Long[] temporal = new Long[1];
        try {
            when(catalogo.validarRegion("MX", "Oaxaca")).thenReturn("Oaxaca");
            var admin = principal(a);
            var alta = service.alta(new RegisterRequestDTO("Prueba Administrativa", "admusr" + sufijo,
                    "admusr" + sufijo + "@example.invalid", LocalDate.of(1990, 1, 1), null,
                    "MX", "Oaxaca", null, "Segura123!", false, false), admin);
            temporal[0] = alta.idUsuario();
            assertEquals("USUARIO", alta.rol());
            assertTrue(encoder.matches("Segura123!", usuarios.findById(temporal[0]).orElseThrow().getContrasena()));
            assertNotEquals("Segura123!", usuarios.findById(temporal[0]).orElseThrow().getContrasena());
            assertEquals(1, service.listar("admusr" + sufijo, "USUARIO", EstadoUsuario.ACTIVO,
                    0, 10, "fechaRegistro", "desc", admin).totalElements());
            assertEquals(3, service.resumen(admin).totalUsuarios());
            assertEquals(3, service.roles(admin).size());

            // Un fallo en la transacción exterior revierte juntos rol, version_token y auditoría.
            tx.executeWithoutResult(status -> {
                service.cambiarRol(temporal[0], "MODERADOR", admin);
                status.setRollbackOnly();
            });
            assertEquals("USUARIO", service.detalle(temporal[0], admin).rol());
            assertEquals(0, usuarios.findById(temporal[0]).orElseThrow().getVersionToken());
            assertEquals(0, service.historial(temporal[0], 0, 10, admin).totalElements());

            service.cambiarRol(temporal[0], "MODERADOR", admin);
            assertEquals(1, usuarios.findById(temporal[0]).orElseThrow().getVersionToken());
            assertEquals("MODERADOR", service.historial(temporal[0], 0, 10, admin).content().getFirst().rolNuevo());
            assertEquals(a.getIdUsuario(), service.historial(temporal[0], 0, 10, admin).content().getFirst().idAdministrador());
            service.cambiarEstado(temporal[0], EstadoUsuario.DESACTIVADO, admin);
            assertEquals(2, usuarios.findById(temporal[0]).orElseThrow().getVersionToken());
            service.cambiarEstado(temporal[0], EstadoUsuario.ACTIVO, admin);

            String hashAntes = usuarios.findById(temporal[0]).orElseThrow().getContrasena();
            var sinClave = new AdminEditarUsuarioRequestDTO("Nombre Editado", "admusr" + sufijo,
                    "admusr" + sufijo + "@example.invalid", LocalDate.of(1990, 1, 1), null,
                    "MX", "Oaxaca", null, null, false, false);
            assertEquals("Nombre Editado", service.editar(temporal[0], sinClave, admin).nombre());
            assertEquals(hashAntes, usuarios.findById(temporal[0]).orElseThrow().getContrasena());
            var nuevaClave = new AdminEditarUsuarioRequestDTO("Nombre Editado", "admusr" + sufijo,
                    "nuevo" + sufijo + "@example.invalid", LocalDate.of(1990, 1, 1), null,
                    "MX", "Oaxaca", null, "OtraSegura123!", false, false);
            service.editar(temporal[0], nuevaClave, admin);
            Usuario actualizado = usuarios.findById(temporal[0]).orElseThrow();
            assertTrue(encoder.matches("OtraSegura123!", actualizado.getContrasena()));
            assertEquals(4, actualizado.getVersionToken()); // rol + desactivación + reactivación + credenciales

            CountDownLatch start = new CountDownLatch(1);
            var primera = CompletableFuture.supplyAsync(() -> bloquearTrasSeñal(b.getIdUsuario(), principal(a), start));
            var segunda = CompletableFuture.supplyAsync(() -> bloquearTrasSeñal(a.getIdUsuario(), principal(b), start));
            start.countDown();
            List<Boolean> resultados = List.of(primera.get(30, TimeUnit.SECONDS), segunda.get(30, TimeUnit.SECONDS));
            assertEquals(1, resultados.stream().filter(Boolean::booleanValue).count());
            assertEquals(1, usuarios.countByRol_NombreAndEstado("ADMINISTRADOR", EstadoUsuario.ACTIVO));
        } finally {
            tx.executeWithoutResult(status -> {
                if (temporal[0] != null) {
                    auditoria.deleteAll(auditoria.findByUsuario_IdUsuarioOrderByFechaCambioDesc(temporal[0], PageRequest.of(0, 50))
                            .getContent());
                    usuarios.deleteById(temporal[0]);
                }
                usuarios.deleteById(b.getIdUsuario());
                usuarios.deleteById(a.getIdUsuario());
            });
        }
    }

    private boolean bloquearTrasSeñal(Long id, InsectopiaUserDetails admin, CountDownLatch start) {
        try {
            start.await();
            service.cambiarEstado(id, EstadoUsuario.DESACTIVADO, admin);
            return true;
        } catch (BusinessRuleException exception) {
            return false;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
