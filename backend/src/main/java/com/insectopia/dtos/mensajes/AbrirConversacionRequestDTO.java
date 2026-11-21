package com.insectopia.dtos.mensajes;

import com.fasterxml.jackson.annotation.JsonAnySetter;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Cuerpo de {@code POST /api/conversaciones}. Any-setter rechaza explícitamente
 * cualquier campo adicional, en especial {@code remitenteId}: la identidad del
 * remitente sale únicamente del JWT.
 */
public class AbrirConversacionRequestDTO {

    @NotNull(message = "El destinatario es obligatorio")
    @Positive(message = "El destinatario debe ser válido")
    private Long destinatarioId;

    public Long getDestinatarioId() {
        return destinatarioId;
    }

    public void setDestinatarioId(Long destinatarioId) {
        this.destinatarioId = destinatarioId;
    }

    @JsonAnySetter
    public void rechazarCampoNoPermitido(String campo, Object valor) {
        throw new IllegalArgumentException("Campo no permitido: " + campo);
    }
}
