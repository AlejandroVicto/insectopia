package com.insectopia.dtos.mensajes;

import java.time.LocalDateTime;

import com.insectopia.models.Mensaje;

/**
 * Contrato público del historial (actividad 064). No expone entidades JPA ni
 * datos del remitente más allá de su identificador.
 */
public record MensajeResponseDTO(
        Long id,
        Long conversacionId,
        Long remitenteId,
        String contenido,
        LocalDateTime fechaEnvio,
        LocalDateTime fechaLectura) {

    public static MensajeResponseDTO from(Mensaje mensaje) {
        return new MensajeResponseDTO(
                mensaje.getIdMensaje(),
                mensaje.getConversacion() == null ? null : mensaje.getConversacion().getIdConversacion(),
                mensaje.getRemitente() == null ? null : mensaje.getRemitente().getIdUsuario(),
                mensaje.getContenido(),
                mensaje.getFechaEnvio(),
                // 064 no confirma lecturas reales: nunca inventar un "Visto".
                null);
    }
}
