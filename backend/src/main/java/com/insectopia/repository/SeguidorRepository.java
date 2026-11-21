package com.insectopia.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.Seguidor;
import com.insectopia.models.enums.EstadoUsuario;
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

    /** Ids seguidos por un usuario dentro de un conjunto: evita N+1 en la bandeja. */
    @Query("""
            select s.seguido.idUsuario from Seguidor s
            where s.seguidor.idUsuario = :idSeguidor
              and s.seguido.idUsuario in :ids
            """)
    List<Long> findIdsSeguidos(
            @Param("idSeguidor") Long idSeguidor,
            @Param("ids") Collection<Long> ids);

    /**
     * Seguidos de la actividad 066: búsqueda y paginación se resuelven en MySQL
     * sobre la tabla real {@code seguidores}. Nunca devuelve al propio usuario
     * ni cuentas que no estén activas. El orden es estable.
     */
    @Query(value = """
            select s from Seguidor s
            join s.seguido u
            where s.seguidor.idUsuario = :idSeguidor
              and s.seguido.idUsuario <> :idSeguidor
              and u.estado = :estado
              and (:busqueda is null or lower(u.nombre) like :busqueda escape '\\'
                   or lower(u.nombreUsuario) like :busqueda escape '\\')
            order by lower(u.nombre) asc, lower(u.nombreUsuario) asc, u.idUsuario asc
            """, countQuery = """
            select count(s) from Seguidor s
            join s.seguido u
            where s.seguidor.idUsuario = :idSeguidor
              and s.seguido.idUsuario <> :idSeguidor
              and u.estado = :estado
              and (:busqueda is null or lower(u.nombre) like :busqueda escape '\\'
                   or lower(u.nombreUsuario) like :busqueda escape '\\')
            """)
    Page<Seguidor> buscarSeguidos(
            @Param("idSeguidor") Long idSeguidor,
            @Param("busqueda") String busqueda,
            @Param("estado") EstadoUsuario estado,
            Pageable pageable);
}
