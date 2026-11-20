package com.insectopia.dtos;

import com.insectopia.models.Usuario;

public record AuthResponseDTO(String token, UserDTO user) {
    public record UserDTO(Long id, String role, String name, String email,
                          String nombreUsuario, String avatarUrl) {
        public static UserDTO from(Usuario usuario) {
            return new UserDTO(usuario.getIdUsuario(), usuario.getRol().getNombre(),
                    usuario.getNombre(), usuario.getCorreo(), usuario.getNombreUsuario(),
                    usuario.getFotoPerfil());
        }
    }

    @Override
    public String toString() {
        return "AuthResponseDTO[token=[REDACTED], user=" + user + "]";
    }
}
