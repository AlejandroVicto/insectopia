package com.insectopia.dtos.publicaciones;

import com.insectopia.models.Usuario;

/** Datos públicos del autor; nunca incluye correo, contraseña, teléfono ni tokens. */
public record AutorResumenDTO(
        Long id,
        String nombre,
        String nombreUsuario,
        String avatarUrl) {

    public static AutorResumenDTO from(Usuario usuario) {
        if (usuario == null) {
            return null;
        }
        return new AutorResumenDTO(
                usuario.getIdUsuario(),
                usuario.getNombre(),
                usuario.getNombreUsuario(),
                blankToNull(usuario.getFotoPerfil()));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
