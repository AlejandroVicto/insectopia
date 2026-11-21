package com.insectopia.dtos.mensajes;

import java.time.LocalDateTime;

import com.insectopia.models.Mensaje;

/** Resumen del último mensaje para la bandeja; el contenido completo vive en el historial. */
public record UltimoMensajeDTO(
        Long id,
        String contenido,
        LocalDateTime fechaEnvio) {

    public static UltimoMensajeDTO from(Mensaje mensaje) {
        if (mensaje == null) {
            return null;
        }
        return new UltimoMensajeDTO(
                mensaje.getIdMensaje(),
                mensaje.getContenido(),
                mensaje.getFechaEnvio());
    }
}
