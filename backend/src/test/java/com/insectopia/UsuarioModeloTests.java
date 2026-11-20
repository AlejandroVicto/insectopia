package com.insectopia;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.Arrays;

import org.junit.jupiter.api.Test;

import com.insectopia.models.Usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Table;

class UsuarioModeloTests {

    @Test
    void mapeoDeCamposDeUsuario() throws NoSuchFieldException {
        assertCampo("nombreUsuario", String.class, "nombre_usuario", 30, false);
        assertCampo("fechaNacimiento", LocalDate.class, "fecha_nacimiento", 255, false);
        assertCampo("genero", String.class, "genero", 30, true);
        assertCampo("paisCodigo", String.class, "pais_codigo", 2, false);
        assertCampo("estadoRegion", String.class, "estado_region", 100, false);
        assertCampo("fotoPerfil", String.class, "foto_perfil", 500, true);
        assertFalse(Arrays.stream(Usuario.class.getDeclaredFields())
                .anyMatch(campo -> campo.getName().equals("fotoPortada")
                        || campo.isAnnotationPresent(Column.class)
                        && campo.getAnnotation(Column.class).name().equals("foto_portada")));

        Table tabla = Usuario.class.getAnnotation(Table.class);
        assertEquals("usuarios", tabla.name());
        assertEquals(2, tabla.uniqueConstraints().length);
        assertEquals("uk_usuarios_nombre_usuario", tabla.uniqueConstraints()[0].name());
        assertEquals("uk_usuarios_correo", tabla.uniqueConstraints()[1].name());
    }

    @Test
    void normalizaNombreUsuarioAMinusculas() {
        Usuario usuario = new Usuario();
        usuario.setNombreUsuario("Maria_Insectos.1");
        assertEquals("maria_insectos.1", usuario.getNombreUsuario());
        usuario.setNombreUsuario(null);
        assertNull(usuario.getNombreUsuario());
    }

    private void assertCampo(String nombre, Class<?> tipo, String columna,
            int longitud, boolean opcional) throws NoSuchFieldException {
        Field campo = Usuario.class.getDeclaredField(nombre);
        Column anotacion = campo.getAnnotation(Column.class);
        assertEquals(tipo, campo.getType());
        assertEquals(columna, anotacion.name());
        assertEquals(longitud, anotacion.length());
        assertEquals(opcional, anotacion.nullable());
    }
}
