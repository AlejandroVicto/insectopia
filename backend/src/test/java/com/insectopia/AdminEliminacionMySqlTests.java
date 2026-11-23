package com.insectopia;

import static org.junit.jupiter.api.Assertions.*;

import java.sql.Statement;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.AdminEliminacionService;
import com.insectopia.services.AdminService;
import com.insectopia.services.PublicacionesService;
import com.insectopia.services.EventoService;
import com.insectopia.services.LimpiezaArchivosCuentaService;
import com.insectopia.security.ProtectedAccounts;

/** Borrado sólo sobre cuentas creadas por la prueba en insectopia_test. */
@EnabledIfEnvironmentVariable(named = "DB_NAME", matches = "insectopia_test")
@SpringBootTest
class AdminEliminacionMySqlTests {
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        if (!"insectopia_test".equals(System.getenv("DB_NAME"))) throw new IllegalStateException("Usa insectopia_test");
        registry.add("spring.datasource.url", () -> "jdbc:mysql://" + System.getenv().getOrDefault("DB_HOST", "localhost")
                + ":" + System.getenv().getOrDefault("DB_PORT", "3306") + "/insectopia_test");
        registry.add("spring.datasource.username", () -> required("DB_USER"));
        registry.add("spring.datasource.password", () -> required("DB_PASSWORD"));
    }
    private static String required(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) throw new IllegalStateException("Falta " + key);
        return value;
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate tx;
    @Autowired UsuarioRepository usuarios;
    @Autowired RolRepository roles;
    @Autowired PasswordEncoder encoder;
    @Autowired AdminEliminacionService eliminacion;
    @Autowired AdminService adminService;
    @Autowired PublicacionesService publicaciones;
    @Autowired EventoService eventos;
    @Autowired LimpiezaArchivosCuentaService archivos;

    private Usuario crear(String alias, String rol) {
        Usuario user = new Usuario(); user.setRol(roles.findByNombre(rol).orElseThrow());
        user.setNombre("Cuenta Temporal"); user.setNombreUsuario(alias); user.setCorreo(alias + "@example.invalid");
        user.setContrasena(encoder.encode("Segura123!")); user.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        user.setPaisCodigo("MX"); user.setEstadoRegion("Oaxaca");
        return usuarios.saveAndFlush(user);
    }

    private long insertar(String sql, Object... args) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) ps.setObject(i + 1, args[i]);
            return ps;
        }, key);
        return key.getKey().longValue();
    }

    private long conteo(String table, String column, long id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE " + column + " = ?", Long.class, id);
    }

    @Test void borradoTransaccionalConservaTercerosYAnonimizaHistorial() {
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        Usuario a = tx.execute(s -> crear("elad" + sufijo, "ADMINISTRADOR"));
        Usuario objetivo = tx.execute(s -> crear("elobj" + sufijo, "USUARIO"));
        Usuario tercero = tx.execute(s -> crear("elotro" + sufijo, "USUARIO"));
        var principal = new InsectopiaUserDetails(a.getIdUsuario(), a.getCorreo(), a.getContrasena(),
                "ADMINISTRADOR", 0, Permissions.authoritiesFor("ADMINISTRADOR"));
        long[] ids = new long[9];
        try {
            String imagenPublicacion = UUID.randomUUID() + ".png";
            String imagenEvento = "eventos/" + UUID.randomUUID() + ".jpg";
            ids[0] = insertar("INSERT INTO publicaciones (id_usuario, contenido, imagen) VALUES (?, ?, ?)", objetivo.getIdUsuario(), "Texto propio", imagenPublicacion);
            ids[1] = insertar("INSERT INTO comentarios (id_publicacion,id_usuario,contenido) VALUES (?,?,?)", ids[0], tercero.getIdUsuario(), "Comentario de tercero");
            ids[7] = insertar("INSERT INTO publicaciones (id_usuario, contenido) VALUES (?, ?)", tercero.getIdUsuario(), "Otra publicación");
            ids[8] = insertar("INSERT INTO comentarios (id_publicacion,id_usuario,contenido) VALUES (?,?,?)", ids[7], objetivo.getIdUsuario(), "Comentario propio");
            ids[2] = insertar("INSERT INTO reacciones (id_publicacion,id_usuario,tipo) VALUES (?,?,?)", ids[0], tercero.getIdUsuario(), "ME_GUSTA");
            ids[3] = insertar("INSERT INTO reportes (id_reportante,id_publicacion,motivo,descripcion) VALUES (?,?,?,?)",
                    tercero.getIdUsuario(), ids[0], "SPAM", "Información de la cuenta");
            ids[4] = insertar("INSERT INTO eventos (id_proponente,titulo,descripcion,ubicacion,imagen,fecha_inicio,fecha_fin,cupo_maximo,estado) VALUES (?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 2 DAY),DATE_ADD(NOW(),INTERVAL 3 DAY),?,?)",
                    objetivo.getIdUsuario(), "Evento propio", "Datos propios", "Ubicación", imagenEvento, 10, "APROBADO");
            jdbc.update("INSERT INTO participantes_evento (id_evento,id_usuario) VALUES (?,?)", ids[4], tercero.getIdUsuario());
            ids[5] = insertar("INSERT INTO conversaciones (clave_directa) VALUES (?)", "directa:" + objetivo.getIdUsuario() + ":" + tercero.getIdUsuario());
            jdbc.update("INSERT INTO participantes_conversacion (id_conversacion,id_usuario) VALUES (?,?),(?,?)",
                    ids[5], objetivo.getIdUsuario(), ids[5], tercero.getIdUsuario());
            ids[6] = insertar("INSERT INTO mensajes (id_conversacion,id_remitente,contenido) VALUES (?,?,?)",
                    ids[5], tercero.getIdUsuario(), "Mensaje de tercero");
            jdbc.update("INSERT INTO mensajes (id_conversacion,id_remitente,contenido) VALUES (?,?,?)", ids[5], objetivo.getIdUsuario(), "Mensaje propio");
            long auditoria = insertar("INSERT INTO auditoria_roles (id_administrador,id_usuario,id_rol_anterior,id_rol_nuevo) VALUES (?,?,?,?)",
                    a.getIdUsuario(), objetivo.getIdUsuario(), objetivo.getRol().getIdRol(), a.getRol().getIdRol());

            var visitante = new InsectopiaUserDetails(tercero.getIdUsuario(), tercero.getCorreo(), tercero.getContrasena(),
                    "USUARIO", 0, Permissions.authoritiesFor("USUARIO"));
            assertEquals(1, publicaciones.listar(0, 10, "global", "Texto propio", visitante).getTotalElements());
            assertEquals(1, publicaciones.listarComentarios(ids[7], 0, 10, visitante).getTotalElements());
            assertEquals(1, eventos.listar(0, 10, null, null, null, null, null, false, visitante).getTotalElements());
            adminService.cambiarEstado(objetivo.getIdUsuario(), EstadoUsuario.DESACTIVADO, principal);
            assertEquals(0, publicaciones.listar(0, 10, "global", "Texto propio", visitante).getTotalElements());
            assertThrows(ResourceNotFoundException.class, () -> publicaciones.obtener(ids[0], visitante));
            assertEquals(0, publicaciones.listarComentarios(ids[7], 0, 10, visitante).getTotalElements());
            assertEquals(0, eventos.listar(0, 10, null, null, null, null, null, false, visitante).getTotalElements());
            assertThrows(ResourceNotFoundException.class, () -> eventos.obtener(ids[4], visitante));
            assertEquals(1, conteo("publicaciones", "id_publicacion", ids[0]));
            adminService.cambiarEstado(objetivo.getIdUsuario(), EstadoUsuario.ACTIVO, principal);
            assertEquals(1, publicaciones.listar(0, 10, "global", "Texto propio", visitante).getTotalElements());
            assertEquals(1, publicaciones.listarComentarios(ids[7], 0, 10, visitante).getTotalElements());
            assertEquals(1, eventos.listar(0, 10, null, null, null, null, null, false, visitante).getTotalElements());

            tx.executeWithoutResult(status -> {
                eliminacion.eliminar(objetivo.getIdUsuario(), principal);
                status.setRollbackOnly();
            });
            assertEquals(1, conteo("usuarios", "id_usuario", objetivo.getIdUsuario()));
            assertEquals(1, conteo("publicaciones", "id_publicacion", ids[0]));
            assertEquals(1, conteo("mensajes", "id_mensaje", ids[6]));
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM limpieza_archivos_pendientes", Long.class));

            eliminacion.eliminar(objetivo.getIdUsuario(), principal);
            assertEquals(0, conteo("usuarios", "id_usuario", objetivo.getIdUsuario()));
            assertEquals(0, conteo("publicaciones", "id_publicacion", ids[0]));
            assertEquals(1, conteo("publicaciones", "id_publicacion", ids[7]));
            assertEquals(0, conteo("comentarios", "id_comentario", ids[8]));
            assertEquals(0, conteo("mensajes", "id_remitente", objetivo.getIdUsuario()));
            assertEquals(1, conteo("mensajes", "id_mensaje", ids[6]));
            assertEquals(1, conteo("comentarios", "id_comentario", ids[1]));
            assertNull(jdbc.queryForObject("SELECT id_publicacion FROM comentarios WHERE id_comentario = ?", Long.class, ids[1]));
            assertEquals(1, conteo("reacciones", "id_reaccion", ids[2]));
            assertNull(jdbc.queryForObject("SELECT id_publicacion FROM reportes WHERE id_reporte = ?", Long.class, ids[3]));
            assertNull(jdbc.queryForObject("SELECT descripcion FROM reportes WHERE id_reporte = ?", String.class, ids[3]));
            assertNull(jdbc.queryForObject("SELECT id_proponente FROM eventos WHERE id_evento = ?", Long.class, ids[4]));
            assertEquals("Evento de cuenta eliminada", jdbc.queryForObject("SELECT titulo FROM eventos WHERE id_evento = ?", String.class, ids[4]));
            assertNull(jdbc.queryForObject("SELECT id_usuario FROM auditoria_roles WHERE id_auditoria = ?", Long.class, auditoria));
            assertEquals("archivada:" + ids[5], jdbc.queryForObject("SELECT clave_directa FROM conversaciones WHERE id_conversacion = ?", String.class, ids[5]));
            assertEquals(1, conteo("usuarios", "id_usuario", tercero.getIdUsuario()));
            assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM limpieza_archivos_pendientes", Long.class));
            archivos.procesarPendientes();
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM limpieza_archivos_pendientes", Long.class));
        } finally {
            tx.executeWithoutResult(s -> {
                jdbc.update("DELETE FROM notificaciones WHERE id_destinatario IN (?,?)", a.getIdUsuario(), tercero.getIdUsuario());
                jdbc.update("DELETE FROM mensajes WHERE id_conversacion = ?", ids[5]);
                jdbc.update("DELETE FROM participantes_conversacion WHERE id_conversacion = ?", ids[5]);
                jdbc.update("DELETE FROM conversaciones WHERE id_conversacion = ?", ids[5]);
                jdbc.update("DELETE FROM participantes_evento WHERE id_evento = ?", ids[4]);
                jdbc.update("DELETE FROM eventos WHERE id_evento = ?", ids[4]);
                jdbc.update("DELETE FROM reportes WHERE id_reporte = ?", ids[3]);
                jdbc.update("DELETE FROM comentarios WHERE id_comentario = ?", ids[1]);
                jdbc.update("DELETE FROM comentarios WHERE id_comentario = ?", ids[8]);
                jdbc.update("DELETE FROM reacciones WHERE id_reaccion = ?", ids[2]);
                jdbc.update("DELETE FROM auditoria_roles WHERE id_usuario IN (?,?) OR id_administrador = ? OR (id_usuario IS NULL AND id_administrador = ?)", objetivo.getIdUsuario(), tercero.getIdUsuario(), a.getIdUsuario(), a.getIdUsuario());
                jdbc.update("DELETE FROM publicaciones WHERE id_publicacion = ?", ids[0]);
                jdbc.update("DELETE FROM publicaciones WHERE id_publicacion = ?", ids[7]);
                jdbc.update("DELETE FROM usuarios WHERE id_usuario IN (?,?,?)", a.getIdUsuario(), tercero.getIdUsuario(), objetivo.getIdUsuario());
            });
        }
    }

    @Test void protegeCuentaPropiaYCuentaDeEvaluacion() {
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        Usuario a = tx.execute(s -> crear("ultad" + sufijo, "ADMINISTRADOR"));
        Usuario evaluacion = tx.execute(s -> crear(ProtectedAccounts.EVALUATION_ADMIN_USERNAME, "USUARIO"));
        try {
            var principal = new InsectopiaUserDetails(a.getIdUsuario(), a.getCorreo(), a.getContrasena(),
                    "ADMINISTRADOR", 0, Permissions.authoritiesFor("ADMINISTRADOR"));
            assertThrows(BusinessRuleException.class, () -> eliminacion.eliminar(a.getIdUsuario(), principal));
            assertThrows(BusinessRuleException.class, () -> eliminacion.eliminar(evaluacion.getIdUsuario(), principal));
            assertEquals(1, conteo("usuarios", "id_usuario", a.getIdUsuario()));
            assertEquals(1, conteo("usuarios", "id_usuario", evaluacion.getIdUsuario()));
        } finally { tx.executeWithoutResult(s -> {
            usuarios.deleteById(evaluacion.getIdUsuario());
            usuarios.deleteById(a.getIdUsuario());
        }); }
    }

    @Test void dosSolicitudesConcurrentesNoEliminanAlUltimoAdmin() throws Exception {
        assertEquals(0, usuarios.countByRol_NombreAndEstado("ADMINISTRADOR", EstadoUsuario.ACTIVO),
                "La base de test debe estar libre de administradores preexistentes");
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        Usuario a = tx.execute(s -> crear("eliA" + sufijo, "ADMINISTRADOR"));
        Usuario b = tx.execute(s -> crear("eliB" + sufijo, "ADMINISTRADOR"));
        try {
            var adminA = new InsectopiaUserDetails(a.getIdUsuario(), a.getCorreo(), a.getContrasena(),
                    "ADMINISTRADOR", 0, Permissions.authoritiesFor("ADMINISTRADOR"));
            var adminB = new InsectopiaUserDetails(b.getIdUsuario(), b.getCorreo(), b.getContrasena(),
                    "ADMINISTRADOR", 0, Permissions.authoritiesFor("ADMINISTRADOR"));
            CountDownLatch comenzar = new CountDownLatch(1);
            var primero = CompletableFuture.supplyAsync(() -> intento(b.getIdUsuario(), adminA, comenzar));
            var segundo = CompletableFuture.supplyAsync(() -> intento(a.getIdUsuario(), adminB, comenzar));
            comenzar.countDown();
            assertEquals(1, (primero.get(30, TimeUnit.SECONDS) ? 1 : 0)
                    + (segundo.get(30, TimeUnit.SECONDS) ? 1 : 0));
            assertEquals(1, usuarios.countByRol_NombreAndEstado("ADMINISTRADOR", EstadoUsuario.ACTIVO));
        } finally { tx.executeWithoutResult(s -> {
            if (usuarios.existsById(a.getIdUsuario())) usuarios.deleteById(a.getIdUsuario());
            if (usuarios.existsById(b.getIdUsuario())) usuarios.deleteById(b.getIdUsuario());
        }); }
    }

    private boolean intento(Long id, InsectopiaUserDetails admin, CountDownLatch comenzar) {
        try {
            comenzar.await();
            eliminacion.eliminar(id, admin);
            return true;
        } catch (BusinessRuleException exception) {
            return false;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
