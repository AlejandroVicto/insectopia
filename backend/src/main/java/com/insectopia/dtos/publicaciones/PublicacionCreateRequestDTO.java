package com.insectopia.dtos.publicaciones;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** El autor nunca viene en el cuerpo: se obtiene del principal autenticado. */
public record PublicacionCreateRequestDTO(
        @NotBlank(message = "El contenido de la publicación es obligatorio")
        @Size(max = 5000, message = "El contenido no puede superar los 5000 caracteres")
        String contenido,

        @Size(max = 500, message = "La imagen no puede superar los 500 caracteres")
        String imagen) {

    public String contenidoNormalizado() {
        return contenido == null ? null : contenido.trim();
    }

    public String imagenNormalizada() {
        return imagen == null || imagen.isBlank() ? null : imagen.trim();
    }
}
