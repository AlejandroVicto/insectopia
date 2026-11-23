package com.insectopia.dtos;

import java.time.LocalDateTime;

import com.insectopia.models.Usuario;

/**
 * Actividad 074: contrato privado de «Mi perfil».
 * Expone únicamente los campos consumidos por {@code adaptarPerfil.js}; nunca
 * incluye correo, contraseña, teléfono, fecha de nacimiento, género,
 * preferencias de contacto, tokens ni versión de token.
 */
public record MiPerfilResponseDTO(
        Long idUsuario,
        String nombre,
        String nombreUsuario,
        String fotoPerfil,
        String biografia,
        String paisCodigo,
        String estadoRegion,
        LocalDateTime fechaRegistro,
        long totalSeguidores,
        long totalSeguidos,
        long totalPublicaciones) {

    public static MiPerfilResponseDTO from(
            Usuario usuario,
            long totalSeguidores,
            long totalSeguidos,
            long totalPublicaciones) {
        return new MiPerfilResponseDTO(
                usuario.getIdUsuario(),
                usuario.getNombre(),
                usuario.getNombreUsuario(),
                usuario.getFotoPerfil(),
                usuario.getBiografia(),
                usuario.getPaisCodigo(),
                usuario.getEstadoRegion(),
                usuario.getFechaRegistro(),
                totalSeguidores,
                totalSeguidos,
                totalPublicaciones);
    }
}
