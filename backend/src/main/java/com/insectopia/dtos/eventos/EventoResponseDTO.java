package com.insectopia.dtos.eventos;

import java.time.LocalDateTime;

import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.models.enums.EstadoParticipanteEvento;

public record EventoResponseDTO(
        Long idEvento, String titulo, String descripcion, String ubicacion, String imagen,
        LocalDateTime fechaInicio, LocalDateTime fechaFin, Integer cupoMaximo,
        long participantesConfirmados, EstadoEvento estado, ProponentePublico proponentePublico,
        EstadoParticipanteEvento estadoInscripcion, boolean esPropio, String motivoResolucion) {
    public record ProponentePublico(String nombre, String nombreUsuario) { }
}
