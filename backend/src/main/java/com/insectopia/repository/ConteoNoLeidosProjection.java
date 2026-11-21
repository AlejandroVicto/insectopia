package com.insectopia.repository;

/** Proyección de la consulta agrupada de mensajes no leídos (actividad 064). */
public interface ConteoNoLeidosProjection {

    Long getConversacionId();

    long getTotal();
}
