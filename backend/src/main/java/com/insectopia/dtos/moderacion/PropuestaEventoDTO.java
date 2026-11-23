package com.insectopia.dtos.moderacion;

import java.time.LocalDateTime;

import com.insectopia.models.Evento;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoEvento;

/** Vista de moderación: incluye la trazabilidad privada que no expone el DTO público de eventos. */
public record PropuestaEventoDTO(
        Long idEvento,
        String titulo,
        String descripcion,
        String ubicacion,
        String imagen,
        LocalDateTime fechaInicio,
        LocalDateTime fechaFin,
        Integer cupoMaximo,
        LocalDateTime fechaCreacion,
        EstadoEvento estado,
        Proponente proponente,
        Long moderadorId,
        String motivoResolucion,
        LocalDateTime fechaResolucion) {

    public record Proponente(Long idUsuario, String nombre, String nombreUsuario) { }

    public static PropuestaEventoDTO from(Evento evento) {
        Usuario proponente = evento.getProponente();
        Usuario moderador = evento.getModerador();
        return new PropuestaEventoDTO(
                evento.getIdEvento(),
                evento.getTitulo(),
                evento.getDescripcion(),
                evento.getUbicacion(),
                evento.getImagen(),
                evento.getFechaInicio(),
                evento.getFechaFin(),
                evento.getCupoMaximo(),
                evento.getFechaCreacion(),
                evento.getEstado(),
                proponente == null ? null : new Proponente(
                        proponente.getIdUsuario(), proponente.getNombre(), proponente.getNombreUsuario()),
                moderador == null ? null : moderador.getIdUsuario(),
                evento.getMotivoResolucion(),
                evento.getFechaResolucion());
    }
}
