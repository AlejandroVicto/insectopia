package com.insectopia.dtos.admin;

import com.insectopia.models.enums.EstadoUsuario;

import jakarta.validation.constraints.NotNull;

public record AdminEstadoRequestDTO(@NotNull EstadoUsuario estado) { }
