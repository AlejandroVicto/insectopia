package com.insectopia.dtos.publicaciones;

/** Estado de reacción del usuario autenticado y total confirmado para una publicación. */
public record ReaccionEstadoDTO(
        Long publicacionId,
        boolean reaccionada,
        String tipo,
        long total) {
}
