package com.insectopia.dtos.publicaciones;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Null;

public record PublicacionUpdateRequestDTO(
        @NotBlank @Size(max = 5000) String contenido,
        @Null(message = "Usa el endpoint multipart para modificar la imagen") String imagen) {
    public String contenidoNormalizado() {
        return contenido == null ? null : contenido.trim();
    }
}
