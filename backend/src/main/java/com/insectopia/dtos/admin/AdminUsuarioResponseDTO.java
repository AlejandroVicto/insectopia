package com.insectopia.dtos.admin;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.security.ProtectedAccounts;

public record AdminUsuarioResponseDTO(Long idUsuario, String nombre, String nombreUsuario,
        String correo, String rol, EstadoUsuario estado, String paisCodigo, String estadoRegion,
        String fotoPerfil, LocalDate fechaNacimiento, String genero, String telefono,
        boolean recibirSms, boolean recibirWhatsapp,
        LocalDateTime fechaRegistro, LocalDateTime fechaActualizacion,
        boolean protegida, boolean cuentaPropia) {

    public static AdminUsuarioResponseDTO from(Usuario usuario, Long administradorId) {
        return new AdminUsuarioResponseDTO(usuario.getIdUsuario(), usuario.getNombre(),
                usuario.getNombreUsuario(), usuario.getCorreo(), usuario.getRol().getNombre(),
                usuario.getEstado(), usuario.getPaisCodigo(), usuario.getEstadoRegion(),
                usuario.getFotoPerfil(), usuario.getFechaNacimiento(), usuario.getGenero(), usuario.getTelefono(),
                Boolean.TRUE.equals(usuario.getRecibirSms()), Boolean.TRUE.equals(usuario.getRecibirWhatsapp()),
                usuario.getFechaRegistro(), usuario.getFechaActualizacion(),
                ProtectedAccounts.EVALUATION_ADMIN_USERNAME.equals(usuario.getNombreUsuario()),
                usuario.getIdUsuario().equals(administradorId));
    }
}
