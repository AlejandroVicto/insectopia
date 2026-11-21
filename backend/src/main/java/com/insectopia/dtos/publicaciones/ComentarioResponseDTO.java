package com.insectopia.dtos.publicaciones;

import java.time.LocalDateTime;

import com.insectopia.models.Comentario;

/** DTO público de comentario: sin entidades JPA ni datos privados del autor. */
public record ComentarioResponseDTO(
        Long id,
        Long publicacionId,
        AutorResumenDTO autor,
        String contenido,
        LocalDateTime fechaComentario) {

    public static ComentarioResponseDTO from(Comentario comentario) {
        return new ComentarioResponseDTO(
                comentario.getIdComentario(),
                comentario.getPublicacion() == null ? null : comentario.getPublicacion().getIdPublicacion(),
                AutorResumenDTO.from(comentario.getUsuario()),
                comentario.getContenido(),
                comentario.getFechaComentario());
    }
}
