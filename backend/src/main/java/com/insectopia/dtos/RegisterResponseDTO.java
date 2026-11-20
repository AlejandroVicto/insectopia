package com.insectopia.dtos;

public record RegisterResponseDTO(Long idUsuario, String nombre, String nombreUsuario,
        String correo, String rol, String mensaje) {
}
