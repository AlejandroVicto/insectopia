package com.insectopia.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.Reaccion;
import com.insectopia.models.enums.EstadoUsuario;

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

    long countByPublicacion_IdPublicacionAndUsuario_Estado(Long idPublicacion, EstadoUsuario estado);

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

    /** Actividad 074: totales agrupados de una página, sin una consulta por publicación. */
    @Query("""
            select r.publicacion.idPublicacion, count(r)
            from Reaccion r
            where r.publicacion.idPublicacion in :ids and r.usuario.estado = com.insectopia.models.enums.EstadoUsuario.ACTIVO
            group by r.publicacion.idPublicacion
            """)
    List<Object[]> contarPorPublicaciones(@Param("ids") Collection<Long> ids);

    /** Actividad 074: reacción propia de cada publicación de la página en una sola consulta. */
    @Query("""
            select r.publicacion.idPublicacion, r.tipo
            from Reaccion r
            where r.publicacion.idPublicacion in :ids
              and r.usuario.idUsuario = :idUsuario
            """)
    List<Object[]> tiposDelUsuario(
            @Param("ids") Collection<Long> ids,
            @Param("idUsuario") Long idUsuario);
}
