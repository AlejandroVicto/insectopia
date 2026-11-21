package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Reporte;
import com.insectopia.models.enums.EstadoReporte;

public interface ReporteRepository
        extends JpaRepository<Reporte, Long> {

    Page<Reporte> findAllByOrderByFechaReporteDesc(Pageable pageable);

    // Consultar reportes por estado, del más reciente al más antiguo
    Page<Reporte> findByEstadoOrderByFechaReporteDesc(
            EstadoReporte estado,
            Pageable pageable
    );

    // Consultar reportes realizados por un usuario
    Page<Reporte> findByReportante_IdUsuarioOrderByFechaReporteDesc(
            Long idUsuario,
            Pageable pageable
    );

    // Consultar los reportes de una publicación
    Page<Reporte> findByPublicacion_IdPublicacionOrderByFechaReporteDesc(
            Long idPublicacion,
            Pageable pageable
    );

    // Consultar reportes gestionados por un moderador
    Page<Reporte> findByModerador_IdUsuarioOrderByFechaReporteDesc(
            Long idModerador,
            Pageable pageable
    );

    // Contar reportes según su estado
    long countByEstado(EstadoReporte estado);

    // Comprobar si un usuario ya reportó una publicación
    boolean existsByReportante_IdUsuarioAndPublicacion_IdPublicacion(
            Long idUsuario,
            Long idPublicacion
    );
}
