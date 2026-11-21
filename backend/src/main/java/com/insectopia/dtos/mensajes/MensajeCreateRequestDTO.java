package com.insectopia.dtos.mensajes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo del envío de mensajes (actividad 064).
 * El remitente nunca viene en el cuerpo: se obtiene exclusivamente del JWT.
 */
public record MensajeCreateRequestDTO(
        @NotBlank(message = "El contenido del mensaje es obligatorio")
        @Size(max = 5000, message = "El contenido no puede superar los 5000 caracteres")
        String contenido) {

    public String contenidoNormalizado() {
        return contenido == null ? null : contenido.trim();
    }

    /** Evita que el contenido privado aparezca en trazas de validación o logs. */
    @Override
    public String toString() {
        return "MensajeCreateRequestDTO[contenido=[REDACTED]]";
    }
}
