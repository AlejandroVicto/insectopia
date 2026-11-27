package com.insectopia.dtos.admin;

import java.time.LocalDate;
import java.util.Locale;

import com.insectopia.dtos.TelefonoValido;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Sustitución de datos editables; contraseña nula significa conservar la vigente. */
public record AdminEditarUsuarioRequestDTO(
        @NotBlank @Size(max = 100)
        @Pattern(regexp = "[\\p{L}\\p{M}]+(?: +[\\p{L}\\p{M}]+)*") String nombre,
        @NotBlank @Size(min = 3, max = 30)
        @Pattern(regexp = "[a-z0-9._]+") String nombreUsuario,
        @NotBlank @Email @Pattern(regexp = "[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}") @Size(max = 150) String correo,
        @NotNull @PastOrPresent LocalDate fechaNacimiento,
        @Size(max = 30) @Pattern(regexp = "Femenino|Masculino|Otro|Prefiero no decirlo") String genero,
        @NotBlank @Pattern(regexp = "[A-Z]{2}") String paisCodigo,
        @NotBlank @Size(max = 100) String estadoRegion,
        @Size(max = 13) @TelefonoValido @Pattern(regexp = "\\+52\\d{10}", message = "Ingresa un teléfono de 10 dígitos.") String telefono,
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres.")
        @Pattern(regexp = "(?s).*[A-Z].*", message = "La contraseña debe incluir una mayúscula.")
        @Pattern(regexp = "(?s).*[0-9].*", message = "La contraseña debe incluir un número.")
        @Pattern(regexp = "(?s).*[^A-Za-z0-9].*", message = "La contraseña debe incluir un carácter especial.") String contrasena,
        Boolean recibirSms, Boolean recibirWhatsapp) {
    public AdminEditarUsuarioRequestDTO {
        nombre = trim(nombre);
        nombreUsuario = nombreUsuario == null ? null : nombreUsuario.toLowerCase(Locale.ROOT);
        correo = correo == null ? null : correo.trim().toLowerCase(Locale.ROOT);
        genero = blankToNull(genero);
        paisCodigo = paisCodigo == null ? null : paisCodigo.trim().toUpperCase(Locale.ROOT);
        estadoRegion = trim(estadoRegion);
        telefono = blankToNull(telefono);
        recibirSms = Boolean.TRUE.equals(recibirSms);
        recibirWhatsapp = Boolean.TRUE.equals(recibirWhatsapp);
    }

    private static String trim(String value) { return value == null ? null : value.trim(); }
    private static String blankToNull(String value) {
        String result = trim(value);
        return result == null || result.isEmpty() ? null : result;
    }

    @Override public String toString() { return "AdminEditarUsuarioRequestDTO[contrasena=[REDACTED]]"; }
}
