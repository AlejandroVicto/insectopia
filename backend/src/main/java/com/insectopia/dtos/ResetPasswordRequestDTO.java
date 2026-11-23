package com.insectopia.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Contrato exacto del frontend 055: { "token": "...", "contrasena": "..." }. */
public record ResetPasswordRequestDTO(
        @NotBlank(message = "El enlace de recuperación no es válido.")
        @Size(max = 256, message = "El enlace de recuperación no es válido.")
        String token,
        @NotBlank(message = "La contraseña es obligatoria.")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres.")
        @Pattern(regexp = "(?s).*[A-Z].*", message = "La contraseña debe incluir una mayúscula.")
        @Pattern(regexp = "(?s).*[0-9].*", message = "La contraseña debe incluir un número.")
        @Pattern(regexp = "(?s).*[^A-Za-z0-9].*", message = "La contraseña debe incluir un carácter especial.")
        String contrasena) {

    public ResetPasswordRequestDTO {
        // El token del enlace no contiene espacios; recortarlo no altera su entropía.
        token = token == null ? null : token.trim();
        // La contraseña NO se recorta, normaliza ni transforma.
    }

    @Override
    public String toString() {
        return "ResetPasswordRequestDTO[token=[REDACTED], contrasena=[REDACTED]]";
    }
}
