package com.insectopia.dtos;

import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonAnySetter;

public record PreferenciasComunicacionRequestDTO(
        @NotNull Boolean recibirSms, @NotNull Boolean recibirWhatsapp) {
    @JsonAnySetter
    public void rechazarCampoDesconocido(String campo, Object valor) {
        throw new IllegalArgumentException("Campo no permitido: " + campo);
    }
}
