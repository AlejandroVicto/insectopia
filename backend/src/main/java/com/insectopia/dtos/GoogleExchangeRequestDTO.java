package com.insectopia.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleExchangeRequestDTO(
        @NotBlank(message = "El código de intercambio es obligatorio.")
        @Size(max = 128, message = "El código de intercambio no es válido.")
        String code) {

    public GoogleExchangeRequestDTO {
        code = code == null ? null : code.trim();
    }
}
