package com.insectopia.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/** El token opaco viaja por cuerpo; el correo y la identidad no viajan desde React. */
public record GoogleCompleteRegistrationRequestDTO(
        @Valid @NotNull GoogleTokenRequestDTO token,
        @Valid @NotNull GoogleRegisterRequestDTO datos) {
}
