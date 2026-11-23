package com.insectopia.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CambiarContrasenaRequest(
        @NotBlank String contrasenaActual,
        @NotBlank @Size(min = 8)
        @Pattern(regexp = "(?s).*[A-Z].*", message = "La contraseña debe incluir una mayúscula.")
        @Pattern(regexp = "(?s).*[0-9].*", message = "La contraseña debe incluir un número.")
        @Pattern(regexp = "(?s).*[^A-Za-z0-9].*", message = "La contraseña debe incluir un carácter especial.")
        String contrasenaNueva) {
    @Override public String toString() { return "CambiarContrasenaRequest[REDACTED]"; }
}
