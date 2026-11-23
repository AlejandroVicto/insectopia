package com.insectopia.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /** Actividad 074: conteos agrupados de una página, sin una consulta por publicación. */
    @Query("""
            select c.publicacion.idPublicacion, count(c)
            from Comentario c
            where c.publicacion.idPublicacion in :ids
            group by c.publicacion.idPublicacion
            """)
    List<Object[]> contarPorPublicaciones(@Param("ids") Collection<Long> ids);
}
