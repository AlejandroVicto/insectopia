package com.insectopia.dtos.mensajes;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Último mensaje recibido realmente cargado en el historial del cliente. */
public record LecturaConversacionRequestDTO(@NotNull @Positive Long mensajeId) { }
