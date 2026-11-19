package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Publicacion;
import com.insectopia.models.enums.EstadoPublicacion;

public interface PublicacionRepository
        extends JpaRepository<Publicacion, Long> {

    boolean existsByIdPublicacionAndUsuario_IdUsuario(Long idPublicacion, Long idUsuario);

    // Publicaciones por estado, ordenadas de más reciente a más antigua
    Page<Publicacion> findByEstadoOrderByFechaPublicacionDesc(
            EstadoPublicacion estado,
            Pageable pageable
    );

    // Publicaciones de un usuario
    Page<Publicacion> findByUsuario_IdUsuarioOrderByFechaPublicacionDesc(
            Long idUsuario,
            Pageable pageable
    );

    // Publicaciones de un usuario filtradas por estado
    Page<Publicacion> findByUsuario_IdUsuarioAndEstado(
            Long idUsuario,
            EstadoPublicacion estado,
            Pageable pageable
    );

    // Buscar publicaciones por palabras en su contenido
    Page<Publicacion> findByContenidoContainingIgnoreCaseAndEstado(
            String contenido,
            EstadoPublicacion estado,
            Pageable pageable
    );
}
