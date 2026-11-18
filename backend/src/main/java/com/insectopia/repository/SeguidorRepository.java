package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Seguidor;
import com.insectopia.models.ids.SeguidorId;

public interface SeguidorRepository
        extends JpaRepository<Seguidor, SeguidorId> {

    // Consultar los seguidores de un usuario
    Page<Seguidor> findBySeguido_IdUsuario(
            Long idUsuario,
            Pageable pageable
    );

    // Consultar las personas que sigue un usuario
    Page<Seguidor> findBySeguidor_IdUsuario(
            Long idUsuario,
            Pageable pageable
    );

    // Comprobar si un usuario sigue a otro
    boolean existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(
            Long idSeguidor,
            Long idSeguido
    );

    // Contar los seguidores de un usuario
    long countBySeguido_IdUsuario(
            Long idUsuario
    );

    // Contar las personas que sigue un usuario
    long countBySeguidor_IdUsuario(
            Long idUsuario
    );
}
