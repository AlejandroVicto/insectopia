package com.insectopia.dtos;

import java.util.Locale;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Contrato exacto del frontend 055: { "correo": "..." }. */
public record ForgotPasswordRequestDTO(
        @NotBlank(message = "El correo es obligatorio.")
        @Email(message = "Ingresa un correo válido.")
        @Pattern(regexp = "[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}", message = "Ingresa un correo válido.")
        @Size(max = 150, message = "El correo no puede superar 150 caracteres.")
        String correo) {

    public ForgotPasswordRequestDTO {
        correo = correo == null ? null : correo.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    public String toString() {
        return "ForgotPasswordRequestDTO[correo=[REDACTED]]";
    }
}
