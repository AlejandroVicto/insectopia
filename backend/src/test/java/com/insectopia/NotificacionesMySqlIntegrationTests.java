package com.insectopia;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.dtos.publicaciones.ComentarioCreateRequestDTO;
import com.insectopia.dtos.reportes.ReporteResolverRequestDTO;
import com.insectopia.models.*;
import com.insectopia.models.enums.*;
import com.insectopia.repository.*;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.*;

/** Usa exclusivamente credenciales de entorno explícitas para insectopia_test. Nunca carga .env. */
@SpringBootTest
class NotificacionesMySqlIntegrationTests {
    @DynamicPropertySource static void baseDePruebas(DynamicPropertyRegistry registry) {
        if (!"insectopia_test".equals(System.getenv("DB_NAME"))) {
            throw new IllegalStateException("DB_NAME debe ser insectopia_test antes de iniciar Flyway");
        }
        registry.add("spring.datasource.url", () -> "jdbc:mysql://" + System.getenv().getOrDefault("DB_HOST", "localhost")
                + ":" + System.getenv().getOrDefault("DB_PORT", "3306") + "/insectopia_test");
        registry.add("spring.datasource.username", () -> required("DB_USER"));
        registry.add("spring.datasource.password", () -> required("DB_PASSWORD"));
    }

    private static String required(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) throw new IllegalStateException("Falta " + key + " de pruebas");
        return value;
    }

    @Autowired TransactionTemplate transacciones;
    @Autowired RolRepository roles;
    @Autowired UsuarioRepository usuarios;
    @Autowired PublicacionRepository publicaciones;
    @Autowired ReporteRepository reportes;
    @Autowired NotificacionRepository notificaciones;
    @Autowired PublicacionesService servicioPublicaciones;
    @Autowired ReportesService servicioReportes;

    private InsectopiaUserDetails principal(Usuario u, String rol) {
        return new InsectopiaUserDetails(u.getIdUsuario(), u.getCorreo(), "hash", rol, 0,
                Permissions.authoritiesFor(rol));
    }

    private Usuario usuario(String alias, Rol rol) {
        Usuario u = new Usuario(); u.setRol(rol); u.setNombre(alias); u.setNombreUsuario(alias);
        u.setCorreo(alias + "@example.invalid"); u.setContrasena("hash");
        u.setFechaNacimiento(LocalDate.of(1990, 1, 1)); u.setPaisCodigo("ES"); u.setEstadoRegion("Madrid");
        return usuarios.saveAndFlush(u);
    }

    @Test void persistenciaAutorizacionYRollbackDeAvisos() {
        AtomicLong destinatario = new AtomicLong();
        assertThrows(IllegalStateException.class, () -> transacciones.executeWithoutResult(status -> {
            String sufijo = UUID.randomUUID().toString().substring(0, 8);
            Rol rol = roles.findByNombre("USUARIO").orElseThrow();
            Usuario autor = usuario("autor" + sufijo, rol);
            Usuario actor = usuario("actor" + sufijo, rol);
            destinatario.set(autor.getIdUsuario());
            Publicacion p = new Publicacion(); p.setUsuario(autor); p.setContenido("Insecto en el jardín");
            publicaciones.saveAndFlush(p);

            servicioPublicaciones.crearComentario(p.getIdPublicacion(),
                    new ComentarioCreateRequestDTO("Hola"), principal(actor, "USUARIO"));
            servicioPublicaciones.reaccionar(p.getIdPublicacion(), principal(actor, "USUARIO"));
            servicioPublicaciones.crearComentario(p.getIdPublicacion(),
                    new ComentarioCreateRequestDTO("Propio"), principal(autor, "USUARIO"));
            assertEquals(2, notificaciones.countByDestinatario_IdUsuarioAndLeidaFalse(autor.getIdUsuario()));
            assertEquals(2, notificaciones.findByDestinatario_IdUsuario(autor.getIdUsuario(),
                    org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements());

            Reporte r = new Reporte(); r.setReportante(actor); r.setPublicacion(p);
            r.setMotivo("SPAM"); r.setEstado(EstadoReporte.PENDIENTE);
            reportes.saveAndFlush(r);
            servicioReportes.resolver(r.getIdReporte(), new ReporteResolverRequestDTO(EstadoReporte.RESUELTO, "Revisado"),
                    principal(autor, "MODERADOR"));
            assertEquals(1, notificaciones.countByDestinatario_IdUsuarioAndLeidaFalse(actor.getIdUsuario()));

            // Una excepción posterior a las inserciones revierte negocio y avisos juntos.
            throw new IllegalStateException("fallo simulado tras las operaciones");
        }));
        assertEquals(0, notificaciones.countByDestinatario_IdUsuarioAndLeidaFalse(destinatario.get()));
    }
}
