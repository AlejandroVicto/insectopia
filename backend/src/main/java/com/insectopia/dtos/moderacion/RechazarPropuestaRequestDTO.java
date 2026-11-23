package com.insectopia.dtos.moderacion;

import com.fasterxml.jackson.annotation.JsonAnySetter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Motivo obligatorio para rechazar una propuesta de evento. */
public record RechazarPropuestaRequestDTO(@NotBlank @Size(max = 500) String motivo) {

    @JsonAnySetter
    public void rechazarCampoDesconocido(String campo, Object valor) {
        throw new IllegalArgumentException("Campo no permitido: " + campo);
    }
}
