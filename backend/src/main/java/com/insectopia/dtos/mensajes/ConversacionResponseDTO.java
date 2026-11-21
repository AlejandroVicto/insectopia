package com.insectopia.dtos.mensajes;

/**
 * DTO público de una conversación para el adaptador de la actividad 063.
 * {@code noLeidos} siempre lo calcula el servidor; {@code oculta} describe la
 * participación del usuario autenticado (la bandeja excluye las ocultas).
 */
public record ConversacionResponseDTO(
        Long id,
        InterlocutorDTO interlocutor,
        UltimoMensajeDTO ultimoMensaje,
        long noLeidos,
        boolean oculta) {
}
