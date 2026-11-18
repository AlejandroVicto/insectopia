package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Comentario;

public interface ComentarioRepository
        extends JpaRepository<Comentario, Long> {

    // Consultar comentarios de una publicación, del más antiguo al más reciente
    Page<Comentario> findByPublicacion_IdPublicacionOrderByFechaComentarioAsc(
            Long idPublicacion,
            Pageable pageable
    );

    // Consultar comentarios realizados por un usuario
    Page<Comentario> findByUsuario_IdUsuarioOrderByFechaComentarioDesc(
            Long idUsuario,
            Pageable pageable
    );

    // Contar los comentarios de una publicación
    long countByPublicacion_IdPublicacion(
            Long idPublicacion
    );

    // Comprobar si un comentario pertenece a un usuario
    boolean existsByIdComentarioAndUsuario_IdUsuario(
            Long idComentario,
            Long idUsuario
    );
}
