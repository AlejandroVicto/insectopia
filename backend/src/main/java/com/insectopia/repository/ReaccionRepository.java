package com.insectopia.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Reaccion;

public interface ReaccionRepository
        extends JpaRepository<Reaccion, Long> {

    // Obtener las reacciones de una publicación
    Page<Reaccion> findByPublicacion_IdPublicacion(
            Long idPublicacion,
            Pageable pageable
    );

    // Contar las reacciones de una publicación
    long countByPublicacion_IdPublicacion(
            Long idPublicacion
    );

    // Comprobar si un usuario reaccionó a una publicación
    boolean existsByPublicacion_IdPublicacionAndUsuario_IdUsuario(
            Long idPublicacion,
            Long idUsuario
    );

    // Obtener la reacción de un usuario a una publicación
    Optional<Reaccion> findByPublicacion_IdPublicacionAndUsuario_IdUsuario(
            Long idPublicacion,
            Long idUsuario
    );

    // Consultar las reacciones realizadas por un usuario
    Page<Reaccion> findByUsuario_IdUsuario(
            Long idUsuario,
            Pageable pageable
    );
}
