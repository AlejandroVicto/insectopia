package com.insectopia.dtos;

import java.time.LocalDate;
import com.insectopia.models.Usuario;

public record ConfiguracionPerfilResponseDTO(Long idUsuario, String nombre, String nombreUsuario,
        String biografia, String genero, String paisCodigo, String estadoRegion,
        LocalDate fechaNacimiento, String telefono, String correo, String fotoPerfil,
        boolean recibirSms, boolean recibirWhatsapp) {
    public static ConfiguracionPerfilResponseDTO from(Usuario u) {
        return new ConfiguracionPerfilResponseDTO(u.getIdUsuario(), u.getNombre(), u.getNombreUsuario(),
                u.getBiografia(), u.getGenero(), u.getPaisCodigo(), u.getEstadoRegion(),
                u.getFechaNacimiento(), u.getTelefono(), u.getCorreo(), u.getFotoPerfil(),
                Boolean.TRUE.equals(u.getRecibirSms()), Boolean.TRUE.equals(u.getRecibirWhatsapp()));
    }
}
