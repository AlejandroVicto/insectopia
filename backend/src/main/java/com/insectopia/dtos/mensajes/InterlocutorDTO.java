package com.insectopia.dtos.mensajes;

import com.insectopia.models.Usuario;

/** Datos públicos del interlocutor; nunca correo, teléfono, credenciales ni tokens. */
public record InterlocutorDTO(
        Long id,
        String nombre,
        String nombreUsuario,
        String avatarUrl,
        Boolean loSigo) {

    public static InterlocutorDTO from(Usuario usuario, boolean loSigo) {
        if (usuario == null) {
            return null;
        }
        return new InterlocutorDTO(
                usuario.getIdUsuario(),
                usuario.getNombre(),
                usuario.getNombreUsuario(),
                blankToNull(usuario.getFotoPerfil()),
                loSigo);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
