package com.insectopia.dtos;

import java.util.Locale;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LoginRequestDTO(
        @NotBlank(message = "El correo es obligatorio.") @Email(message = "Ingresa un correo válido.")
        @Pattern(regexp = "[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}", message = "Ingresa un correo válido.") String correo,
        @NotBlank(message = "La contraseña es obligatoria.") String contrasena) {

    public LoginRequestDTO {
        correo = correo == null ? null : correo.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    public String toString() {
        return "LoginRequestDTO[contrasena=[REDACTED]]";
    }
}
