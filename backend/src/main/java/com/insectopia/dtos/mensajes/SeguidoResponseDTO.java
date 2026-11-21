package com.insectopia.dtos.mensajes;

import com.insectopia.models.Usuario;

/** Datos públicos de una persona que el usuario autenticado sigue (actividad 066). */
public record SeguidoResponseDTO(
        Long id,
        String nombre,
        String nombreUsuario,
        String avatarUrl,
        String descripcion,
        Boolean loSigo) {

    public static SeguidoResponseDTO from(Usuario usuario) {
        if (usuario == null) {
            return null;
        }
        return new SeguidoResponseDTO(
                usuario.getIdUsuario(),
                usuario.getNombre(),
                usuario.getNombreUsuario(),
                blankToNull(usuario.getFotoPerfil()),
                blankToNull(usuario.getBiografia()),
                Boolean.TRUE);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
