package com.insectopia.dtos.publicaciones;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Null;
import jakarta.validation.constraints.Size;

/** El autor nunca viene en el cuerpo: se obtiene del principal autenticado. */
public record PublicacionCreateRequestDTO(
        @NotBlank(message = "El contenido de la publicación es obligatorio")
        @Size(max = 5000, message = "El contenido no puede superar los 5000 caracteres")
        String contenido,

        @Null(message = "Sube la imagen mediante el endpoint multipart de la publicación")
        String imagen) {

    public String contenidoNormalizado() {
        return contenido == null ? null : contenido.trim();
    }

}
