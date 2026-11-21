package com.insectopia.dtos.notificaciones;

/** apiUrl solo apunta a un endpoint GET existente y autorizado; nunca procede del cliente. */
public record RecursoNotificacionDTO(String tipo, Long id, boolean disponible, String apiUrl) { }
