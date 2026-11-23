package com.insectopia.dtos.eventos;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonAnySetter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record EventoRequestDTO(
        @NotBlank @Size(max = 150) String titulo,
        @NotBlank String descripcion,
        @NotBlank @Size(max = 255) String ubicacion,
        @Size(max = 500) String imagen,
        @NotNull LocalDateTime fechaInicio,
        @NotNull LocalDateTime fechaFin,
        @NotNull @Positive Integer cupoMaximo) implements DatosEvento {

    @JsonAnySetter
    public void rechazarCampoDesconocido(String campo, Object valor) {
        throw new IllegalArgumentException("Campo no permitido: " + campo);
    }
}
