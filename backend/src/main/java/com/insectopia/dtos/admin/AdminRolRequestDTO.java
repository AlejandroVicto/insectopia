package com.insectopia.dtos.admin;

import jakarta.validation.constraints.NotBlank;

public record AdminRolRequestDTO(@NotBlank String rol) { }
