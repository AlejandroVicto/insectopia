package com.insectopia.dtos;

import com.insectopia.models.Usuario;

/**
 * Actividad 076: contrato público reutilizado por el listado de seguidores y
 * por {@code GET /api/usuarios/{id}}. Expone únicamente datos visibles para
 * cualquier usuario autenticado; nunca incluye correo, contraseña, teléfono,
 * fecha de nacimiento, género, ubicación, tokens, preferencias ni entidades JPA.
 */
public record UsuarioPublicoDTO(
        Long id,
        String nombre,
        String nombreUsuario,
        String avatarUrl,
        String descripcion,
        Boolean loSigo,
        long totalSeguidores,
        long totalSeguidos) {

    public static UsuarioPublicoDTO from(
            Usuario usuario, boolean loSigo, long totalSeguidores, long totalSeguidos) {
        if (usuario == null) {
            return null;
        }
        return new UsuarioPublicoDTO(
                usuario.getIdUsuario(),
                usuario.getNombre(),
                usuario.getNombreUsuario(),
                blankToNull(usuario.getFotoPerfil()),
                blankToNull(usuario.getBiografia()),
                loSigo,
                totalSeguidores,
                totalSeguidos);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
