package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Evento;
import com.insectopia.models.enums.EstadoEvento;

public interface EventoRepository extends JpaRepository<Evento, Long> {

    // Consultar eventos por estado
    Page<Evento> findByEstado(
            EstadoEvento estado,
            Pageable pageable
    );

    // Consultar eventos propuestos por un usuario
    Page<Evento> findByProponente_IdUsuario(
            Long idUsuario,
            Pageable pageable
    );

    // Consultar eventos por estado, ordenados por fecha de inicio
    Page<Evento> findByEstadoOrderByFechaInicioAsc(
            EstadoEvento estado,
            Pageable pageable
    );

    // Buscar eventos por título
    Page<Evento> findByTituloContainingIgnoreCase(
            String titulo,
            Pageable pageable
    );

    // Consultar los eventos revisados por un moderador
    Page<Evento> findByModerador_IdUsuario(
            Long idModerador,
            Pageable pageable
    );
}
