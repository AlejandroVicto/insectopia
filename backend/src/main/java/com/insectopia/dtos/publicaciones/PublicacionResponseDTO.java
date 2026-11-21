package com.insectopia.dtos.publicaciones;

import java.time.LocalDateTime;

import com.insectopia.models.Publicacion;

/**
 * Contrato público del feed (actividad 059). No expone entidades JPA ni relaciones.
 * No incluye "titulo": la entidad no tiene esa columna y el adaptador la trata como opcional.
 */
public record PublicacionResponseDTO(
        Long id,
        AutorResumenDTO autor,
        String contenido,
        String imagenUrl,
        LocalDateTime fechaPublicacion,
        String estado,
        long totalComentarios,
        long totalReacciones,
        String reaccionUsuario) {

    public static PublicacionResponseDTO from(
            Publicacion publicacion,
            long totalComentarios,
            long totalReacciones,
            String reaccionUsuario) {
        return new PublicacionResponseDTO(
                publicacion.getIdPublicacion(),
                AutorResumenDTO.from(publicacion.getUsuario()),
                publicacion.getContenido(),
                blankToNull(publicacion.getImagen()) == null ? null
                        : "/api/publicaciones/" + publicacion.getIdPublicacion() + "/imagen",
                publicacion.getFechaPublicacion(),
                publicacion.getEstado() == null ? null : publicacion.getEstado().name(),
                totalComentarios,
                totalReacciones,
                blankToNull(reaccionUsuario));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
