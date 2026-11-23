package com.insectopia.dtos;

import java.time.LocalDate;
import java.util.Locale;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonAnySetter;

// La política de propiedades desconocidas se limita a este contrato, no al mapper global.
public record ActualizarPerfilRequestDTO(
        @NotBlank @Size(max = 100)
        @Pattern(regexp = "[\\p{L}\\p{M}]+(?: +[\\p{L}\\p{M}]+)*") String nombre,
        @NotBlank @Size(min = 3, max = 30)
        @Pattern(regexp = "[a-z0-9._]+") String nombreUsuario,
        @Size(max = 500) String biografia,
        @Size(max = 30) @Pattern(regexp = "Femenino|Masculino|Otro|Prefiero no decirlo") String genero,
        @NotBlank @Pattern(regexp = "[A-Z]{2}") String paisCodigo,
        @NotBlank @Size(max = 100) String estadoRegion,
        @NotNull @PastOrPresent LocalDate fechaNacimiento,
        @Size(max = 20) @TelefonoValido
        @Pattern(regexp = "\\+?[0-9][0-9 ()-]*") String telefono) {
    public ActualizarPerfilRequestDTO {
        nombre = trim(nombre);
        nombreUsuario = nombreUsuario == null ? null : nombreUsuario.trim().toLowerCase(Locale.ROOT);
        biografia = vacioANull(biografia);
        genero = vacioANull(genero);
        paisCodigo = paisCodigo == null ? null : paisCodigo.trim().toUpperCase(Locale.ROOT);
        estadoRegion = trim(estadoRegion);
        telefono = vacioANull(telefono);
    }

    @JsonAnySetter
    public void rechazarCampoDesconocido(String campo, Object valor) {
        throw new IllegalArgumentException("Campo no permitido: " + campo);
    }

    private static String trim(String value) { return value == null ? null : value.trim(); }
    private static String vacioANull(String value) {
        String normal = trim(value);
        return normal == null || normal.isEmpty() ? null : normal;
    }
}
