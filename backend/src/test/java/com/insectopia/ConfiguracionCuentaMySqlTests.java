package com.insectopia;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.dtos.ActualizarPerfilRequestDTO;
import com.insectopia.dtos.CambiarContrasenaRequest;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Usuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.JwtService;
import com.insectopia.security.Permissions;
import com.insectopia.services.AdminEliminacionService;
import com.insectopia.services.AlmacenamientoImagenesService;
import com.insectopia.services.CatalogoUbicacionesService;
import com.insectopia.services.ConfiguracionCuentaService;
import com.insectopia.services.LimpiezaArchivosCuentaService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Sólo cuentas efímeras propias; jamás usar fuera de insectopia_test. */
@EnabledIfEnvironmentVariable(named = "DB_NAME", matches = "insectopia_test")
@SpringBootTest
@AutoConfigureMockMvc
class ConfiguracionCuentaMySqlTests {
    private static final String SUFIJO = UUID.randomUUID().toString().substring(0, 8);
    private static final String URL = "https://api.test.invalid";
    private static final String SECRET = secreto();
    private static String secreto() {
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }
    @DynamicPropertySource static void base(DynamicPropertyRegistry r) {
        if (!"insectopia_test".equals(System.getenv("DB_NAME"))) throw new IllegalStateException("Sólo insectopia_test");
        r.add("spring.datasource.url", () -> "jdbc:mysql://" + System.getenv().getOrDefault("DB_HOST", "localhost")
                + ":" + System.getenv().getOrDefault("DB_PORT", "3306") + "/insectopia_test");
        r.add("spring.datasource.username", () -> obligatorio("DB_USER"));
        r.add("spring.datasource.password", () -> obligatorio("DB_PASSWORD"));
        r.add("app.jwt.secret", () -> SECRET);
        r.add("app.api.public-url", () -> URL);
        r.add("app.storage.avatares.path", () -> "./target/test-avatares-" + SUFIJO);
    }
    private static String obligatorio(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) throw new IllegalStateException("Falta " + key);
        return value;
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate tx;
    @Autowired UsuarioRepository usuarios;
    @Autowired RolRepository roles;
    @Autowired PasswordEncoder encoder;
    @Autowired ConfiguracionCuentaService service;
    @Autowired AdminEliminacionService eliminacion;
    @Autowired LimpiezaArchivosCuentaService limpieza;
    @Autowired JwtService jwt;
    @Autowired MockMvc mvc;
    @Autowired @Qualifier("imagenesAvatares") AlmacenamientoImagenesService imagenes;
    @MockitoBean CatalogoUbicacionesService catalogo;
    private final List<Long> creados = new ArrayList<>();

    @BeforeEach void asegurarBase() {
        assertEquals("insectopia_test", jdbc.queryForObject("SELECT DATABASE()", String.class));
        when(catalogo.validarRegion("MX", "Oaxaca")).thenReturn("Oaxaca");
    }
    @AfterEach void limpiarCuentas() {
        for (Long id : creados) jdbc.update("DELETE FROM usuarios WHERE id_usuario = ?", id);
    }

    private Usuario crear(String sufijo, String rol) {
        Usuario u = new Usuario(); u.setRol(roles.findByNombre(rol).orElseThrow());
        u.setNombre("Persona Prueba"); u.setNombreUsuario("test" + SUFIJO + sufijo);
        u.setCorreo("test" + SUFIJO + sufijo + "@example.invalid");
        u.setContrasena(encoder.encode("Actual123!")); u.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        u.setPaisCodigo("MX"); u.setEstadoRegion("Oaxaca");
        u = usuarios.saveAndFlush(u); creados.add(u.getIdUsuario()); return u;
    }
    private InsectopiaUserDetails principal(Usuario u) {
        String rol = u.getRol().getNombre();
        return new InsectopiaUserDetails(u.getIdUsuario(), u.getCorreo(), u.getContrasena(), rol,
                u.getVersionToken(), Permissions.authoritiesFor(rol));
    }

    @Test void dosCuentasCompitenPorUsernameYSoloUnaPersiste() throws Exception {
        Usuario a = tx.execute(s -> crear("a", "USUARIO"));
        Usuario b = tx.execute(s -> crear("b", "USUARIO"));
        String alias = "winner" + SUFIJO;
        CountDownLatch inicio = new CountDownLatch(1);
        var fa = CompletableFuture.supplyAsync(() -> intentarAlias(a, alias, inicio));
        var fb = CompletableFuture.supplyAsync(() -> intentarAlias(b, alias, inicio));
        inicio.countDown();
        assertEquals(1, (fa.get(30, TimeUnit.SECONDS) ? 1 : 0) + (fb.get(30, TimeUnit.SECONDS) ? 1 : 0));
        assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM usuarios WHERE nombre_usuario = ?", Long.class, alias));
    }

    private boolean intentarAlias(Usuario u, String alias, CountDownLatch inicio) {
        try {
            inicio.await();
            service.actualizar(new ActualizarPerfilRequestDTO("Persona Prueba", alias, null, null,
                    "MX", "Oaxaca", LocalDate.of(1990, 1, 1), null), principal(u));
            return true;
        } catch (DuplicateResourceException exception) {
            assertEquals("nombreUsuario", exception.getField());
            return false;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    @Test void contrasenaYVersionJwtSeRevocanEnTransaccionReal() throws Exception {
        Usuario u = tx.execute(s -> crear("clave", "USUARIO"));
        String anterior = jwt.issue(u);
        var resultado = service.cambiarContrasena(new CambiarContrasenaRequest("Actual123!", "Nueva456!"), principal(u));
        assertTrue(resultado.requiereReautenticacion());
        var guardado = usuarios.findById(u.getIdUsuario()).orElseThrow();
        assertEquals(1, guardado.getVersionToken());
        assertTrue(encoder.matches("Nueva456!", guardado.getContrasena()));
        mvc.perform(get("/api/usuarios/me/configuracion").header("Authorization", "Bearer " + anterior))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"" + u.getCorreo() + "\",\"contrasena\":\"Actual123!\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"" + u.getCorreo() + "\",\"contrasena\":\"Nueva456!\"}"))
                .andExpect(status().isOk());
    }

    @Test void eliminacionEncolaAvatarSoloTrasCommitYRestauraEnRollback() throws Exception {
        Usuario admin = tx.execute(s -> crear("admin", "ADMINISTRADOR"));
        Usuario objetivo = tx.execute(s -> crear("objetivo", "USUARIO"));
        Usuario tercero = tx.execute(s -> crear("tercero", "USUARIO"));
        var salida = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2, 2,
                java.awt.image.BufferedImage.TYPE_INT_RGB), "png", salida);
        byte[] png = salida.toByteArray();
        String archivo = imagenes.guardarAvatar(new MockMultipartFile("imagen", "avatar.png", "image/png", png));
        imagenes.confirmarAvatar(archivo);
        String otro = imagenes.guardarAvatar(new MockMultipartFile("imagen", "avatar.png", "image/png", png));
        imagenes.confirmarAvatar(otro);
        try {
            tx.executeWithoutResult(s -> {
                Usuario u = usuarios.bloquearPorId(objetivo.getIdUsuario()).orElseThrow();
                u.setFotoPerfil(URL + "/api/usuarios/" + u.getIdUsuario() + "/avatar?v=" + archivo);
            });
            tx.executeWithoutResult(s -> {
                Usuario u = usuarios.bloquearPorId(tercero.getIdUsuario()).orElseThrow();
                u.setFotoPerfil(URL + "/api/usuarios/" + u.getIdUsuario() + "/avatar?v=" + otro);
            });
            tx.executeWithoutResult(s -> {
                eliminacion.eliminar(objetivo.getIdUsuario(), principal(admin));
                s.setRollbackOnly();
            });
            assertTrue(imagenes.leer(archivo).exists());
            assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM limpieza_archivos_pendientes WHERE tipo = 'avatar' AND nombre = ?", Long.class, archivo));
            eliminacion.eliminar(objetivo.getIdUsuario(), principal(admin));
            assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM limpieza_archivos_pendientes WHERE tipo = 'avatar' AND nombre = ?", Long.class, archivo));
            assertTrue(imagenes.leer(archivo).exists());
            limpieza.procesarPendientes();
            assertThrows(ResourceNotFoundException.class, () -> imagenes.leer(archivo));
            assertTrue(imagenes.leer(otro).exists());
        } finally {
            imagenes.eliminar(archivo);
            imagenes.eliminar(otro);
        }
    }
}
