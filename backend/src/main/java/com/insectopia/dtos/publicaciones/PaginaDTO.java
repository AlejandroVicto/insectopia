package com.insectopia.dtos.publicaciones;

import java.util.List;

import org.springframework.data.domain.Page;

/**
 * Contrato estable de paginación para el adaptador de la actividad 059.
 * Evita serializar PageImpl directamente, cuyo "size" depende del contenido devuelto.
 */
public record PaginaDTO<T>(
        List<T> content,
        int number,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last) {

    public static <T> PaginaDTO<T> from(Page<T> pagina) {
        return new PaginaDTO<>(
                List.copyOf(pagina.getContent()),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages(),
                pagina.isFirst(),
                pagina.isLast());
    }
}
