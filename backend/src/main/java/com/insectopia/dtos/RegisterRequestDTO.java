package com.insectopia.dtos;

import java.time.LocalDate;
import java.util.Locale;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequestDTO(
        @NotBlank(message = "El nombre es obligatorio.") @Size(max = 100)
        @Pattern(regexp = "[\\p{L}\\p{M}]+(?: +[\\p{L}\\p{M}]+)*",
                message = "El nombre solo puede contener letras y espacios.") String nombre,
        @NotBlank(message = "El nombre de usuario es obligatorio.")
        @Size(min = 3, max = 30, message = "Usa de 3 a 30 caracteres.")
        @Pattern(regexp = "[a-z0-9._]+", message = "Usa minúsculas, números, _ y . sin espacios.") String nombreUsuario,
        @NotBlank(message = "El correo es obligatorio.") @Email(message = "Ingresa un correo válido.")
        @Pattern(regexp = "[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}", message = "Ingresa un correo válido.")
        @Size(max = 150) String correo,
        @NotNull(message = "La fecha de nacimiento es obligatoria.")
        @PastOrPresent(message = "La fecha de nacimiento no puede ser futura.") LocalDate fechaNacimiento,
        @Size(max = 30) @Pattern(regexp = "Femenino|Masculino|Otro|Prefiero no decirlo", message = "Género no admitido.") String genero,
        @NotBlank(message = "El país es obligatorio.")
        @Pattern(regexp = "[A-Z]{2}", message = "Usa un código ISO de dos letras.") String paisCodigo,
        @NotBlank(message = "La región es obligatoria.") @Size(max = 100) String estadoRegion,
        @Size(max = 13) @TelefonoValido
        @Pattern(regexp = "\\+52\\d{10}", message = "Ingresa un teléfono de 10 dígitos.") String telefono,
        @NotBlank(message = "La contraseña es obligatoria.")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres.")
        @Pattern(regexp = "(?s).*[A-Z].*", message = "La contraseña debe incluir una mayúscula.")
        @Pattern(regexp = "(?s).*[0-9].*", message = "La contraseña debe incluir un número.")
        @Pattern(regexp = "(?s).*[^A-Za-z0-9].*", message = "La contraseña debe incluir un carácter especial.") String contrasena,
        Boolean recibirSms,
        Boolean recibirWhatsapp) {

    public RegisterRequestDTO {
        nombre = trim(nombre);
        nombreUsuario = nombreUsuario == null ? null : nombreUsuario.toLowerCase(Locale.ROOT);
        correo = correo == null ? null : correo.trim().toLowerCase(Locale.ROOT);
        genero = emptyToNull(genero);
        paisCodigo = paisCodigo == null ? null : paisCodigo.trim().toUpperCase(Locale.ROOT);
        estadoRegion = trim(estadoRegion);
        telefono = emptyToNull(telefono);
        recibirSms = Boolean.TRUE.equals(recibirSms);
        recibirWhatsapp = Boolean.TRUE.equals(recibirWhatsapp);
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }

    private static String emptyToNull(String value) {
        String trimmed = trim(value);
        return trimmed == null || trimmed.isEmpty() ? null : trimmed;
    }

    @Override
    public String toString() {
        return "RegisterRequestDTO[contrasena=[REDACTED]]";
    }
}
