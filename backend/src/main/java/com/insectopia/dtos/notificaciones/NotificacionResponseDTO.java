package com.insectopia.dtos.notificaciones;

import java.time.LocalDateTime;

import com.insectopia.dtos.publicaciones.AutorResumenDTO;

public record NotificacionResponseDTO(Long id, String tipo, String contenido,
        AutorResumenDTO actor, LocalDateTime fechaCreacion, boolean leida,
        RecursoNotificacionDTO recurso) { }
