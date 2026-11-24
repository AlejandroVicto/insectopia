package com.insectopia.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleTokenRequestDTO(
        @NotBlank(message = "El token es obligatorio.")
        @Size(max = 128, message = "El token no es válido.")
        String token) {

    public GoogleTokenRequestDTO {
        token = token == null ? null : token.trim();
    }
}
