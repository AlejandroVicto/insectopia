package com.insectopia;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.sql.Date;
import java.time.LocalDate;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;

import jakarta.persistence.EntityManager;

@SpringBootTest
@Transactional
class UsuarioModeloIntegrationTests {

    @Autowired private UsuarioRepository usuarios;
    @Autowired private RolRepository roles;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    @Test
    void persisteCamposYValoresOpcionalesSinFotoDePortada() {
        Usuario usuario = nuevoUsuario("modelo.insectos", "modelo.insectos@example.invalid");
        usuario.setNombreUsuario("Modelo.Insectos");
        usuario.setFechaNacimiento(LocalDate.of(1995, 6, 15));
        usuarios.saveAndFlush(usuario);
        Long id = usuario.getIdUsuario();
        entityManager.clear();

        Usuario encontrado = usuarios.findById(id).orElseThrow();
        assertEquals("modelo.insectos", encontrado.getNombreUsuario());
        assertEquals(LocalDate.of(1995, 6, 15), encontrado.getFechaNacimiento());
        assertEquals("MX", encontrado.getPaisCodigo());
        assertEquals("Oaxaca", encontrado.getEstadoRegion());
        assertNull(encontrado.getGenero());
        assertNull(encontrado.getFotoPerfil());
        assertEquals("USUARIO", encontrado.getRol().getNombre());
        assertEquals(Date.valueOf(encontrado.getFechaNacimiento()), jdbc.queryForObject(
                "SELECT fecha_nacimiento FROM usuarios WHERE id_usuario = ?", Date.class, id));

        assertFalse(entityManager.getMetamodel().entity(Usuario.class)
                .getAttributes().stream().anyMatch(a -> a.getName().equals("fotoPortada")));
        assertFalse(columnas().contains("foto_portada"));

        encontrado.setGenero("No binario");
        encontrado.setFotoPerfil("https://example.invalid/avatar.png");
        usuarios.saveAndFlush(encontrado);
        entityManager.clear();
        Usuario actualizado = usuarios.findById(id).orElseThrow();
        assertEquals("No binario", actualizado.getGenero());
        assertEquals("https://example.invalid/avatar.png", actualizado.getFotoPerfil());
    }

    @Test
    void restriccionesUnicasDeNombreYCorreoSeAplicanEnMySql() {
        Usuario inicial = nuevoUsuario("original.demo", "original@example.invalid");
        usuarios.saveAndFlush(inicial);
        Long idRol = inicial.getRol().getIdRol();

        // La colación utf8mb4_unicode_ci impide también las variantes de mayúsculas.
        assertThrows(DataIntegrityViolationException.class, () -> insertarUsuario(
                idRol, "ORIGINAL.DEMO", "otro@example.invalid"));
        assertThrows(DataIntegrityViolationException.class, () -> insertarUsuario(
                idRol, "otro.demo", "original@example.invalid"));
    }

    @Test
    void migracionDefineTiposNulabilidadEIndicesEsperados() {
        assertColumna("nombre_usuario", "varchar", 30, "NO");
        assertColumna("fecha_nacimiento", "date", null, "NO");
        assertColumna("genero", "varchar", 30, "YES");
        assertColumna("pais_codigo", "char", 2, "NO");
        assertColumna("estado_region", "varchar", 100, "NO");
        assertColumna("foto_perfil", "varchar", 500, "YES");
        assertFalse(columnas().contains("foto_portada"));
        assertEquals(1, jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.statistics
                WHERE table_schema = DATABASE() AND table_name = 'usuarios'
                  AND index_name = 'uk_usuarios_nombre_usuario' AND non_unique = 0
                """, Integer.class));
        assertEquals(1, jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.statistics
                WHERE table_schema = DATABASE() AND table_name = 'usuarios'
                  AND index_name = 'uk_usuarios_correo' AND non_unique = 0
                """, Integer.class));
    }

    private Usuario nuevoUsuario(String nombreUsuario, String correo) {
        Rol rol = roles.findByNombre("USUARIO").orElseThrow();
        Usuario usuario = new Usuario();
        usuario.setRol(rol);
        usuario.setNombre("Usuario de prueba");
        usuario.setNombreUsuario(nombreUsuario);
        usuario.setCorreo(correo);
        usuario.setContrasena("hash-de-prueba");
        usuario.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        usuario.setPaisCodigo("MX");
        usuario.setEstadoRegion("Oaxaca");
        return usuario;
    }

    private void insertarUsuario(Long idRol, String nombreUsuario, String correo) {
        jdbc.update("""
                INSERT INTO usuarios
                    (id_rol, nombre, nombre_usuario, correo, contrasena,
                     fecha_nacimiento, pais_codigo, estado_region)
                VALUES (?, 'Usuario de prueba', ?, ?, 'hash-de-prueba',
                        '1990-01-01', 'MX', 'Oaxaca')
                """, idRol, nombreUsuario, correo);
    }

    private Set<String> columnas() {
        return Set.copyOf(jdbc.queryForList("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'usuarios'
                """, String.class));
    }

    private void assertColumna(String nombre, String tipo, Integer longitud, String nulable) {
        assertEquals(1, jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'usuarios'
                  AND column_name = ? AND data_type = ? AND is_nullable = ?
                  AND (? IS NULL OR character_maximum_length = ?)
                """, Integer.class, nombre, tipo, nulable, longitud, longitud));
    }
}
