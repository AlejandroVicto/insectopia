package com.insectopia.dtos;

/** Respuesta genérica y estable para operaciones sensibles. */
public record MensajeResponseDTO(String message) {
    public static MensajeResponseDTO of(String message) {
        return new MensajeResponseDTO(message);
    }
}
