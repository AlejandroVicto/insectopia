package com.insectopia.dtos.publicaciones;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** El autor del comentario se toma del JWT, nunca del cuerpo. */
public record ComentarioCreateRequestDTO(
        @NotBlank(message = "El contenido del comentario es obligatorio")
        @Size(max = 1000, message = "El comentario no puede superar los 1000 caracteres")
        String contenido) {

    public String contenidoNormalizado() {
        return contenido == null ? null : contenido.trim();
    }
}
