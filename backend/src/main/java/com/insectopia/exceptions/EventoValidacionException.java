package com.insectopia.exceptions;

/** Errores de entrada de Eventos con mensajes aptos para el cliente. */
public class EventoValidacionException extends IllegalArgumentException {
    public EventoValidacionException(String mensaje) {
        super(mensaje);
    }
}
