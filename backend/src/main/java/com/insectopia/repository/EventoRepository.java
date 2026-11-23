package com.insectopia.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.Evento;
import com.insectopia.models.enums.EstadoEvento;

import jakarta.persistence.LockModeType;

public interface EventoRepository extends JpaRepository<Evento, Long> {
    Page<Evento> findByEstado(EstadoEvento estado, Pageable pageable);
    Page<Evento> findByProponente_IdUsuario(Long idUsuario, Pageable pageable);
    Page<Evento> findByEstadoOrderByFechaInicioAsc(EstadoEvento estado, Pageable pageable);
    Page<Evento> findByTituloContainingIgnoreCase(String titulo, Pageable pageable);
    Page<Evento> findByModerador_IdUsuario(Long idModerador, Pageable pageable);

    @EntityGraph(attributePaths = "proponente")
    @Query("""
            select e from Evento e where e.estado = :estado
            and (:q is null or lower(e.titulo) like :q escape '!' or lower(e.descripcion) like :q escape '!'
                 or lower(e.ubicacion) like :q escape '!')
            and (:desde is null or e.fechaInicio >= :desde)
            and (:hasta is null or e.fechaInicio < :hasta)
            """)
    Page<Evento> listarPublicos(@Param("estado") EstadoEvento estado, @Param("q") String q,
            @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta, Pageable pageable);

    @EntityGraph(attributePaths = "proponente")
    @Query("""
            select e from Evento e where e.proponente.idUsuario = :usuario
            and (:estado is null or e.estado = :estado)
            and (:q is null or lower(e.titulo) like :q escape '!' or lower(e.descripcion) like :q escape '!'
                 or lower(e.ubicacion) like :q escape '!')
            and (:desde is null or e.fechaInicio >= :desde)
            and (:hasta is null or e.fechaInicio < :hasta)
            """)
    Page<Evento> listarPropios(@Param("usuario") Long usuario, @Param("estado") EstadoEvento estado,
            @Param("q") String q, @Param("desde") LocalDateTime desde,
            @Param("hasta") LocalDateTime hasta, Pageable pageable);

    @EntityGraph(attributePaths = "proponente")
    @Query("""
            select e from Evento e join ParticipanteEvento p on p.evento = e
            where p.usuario.idUsuario = :usuario and p.estado = com.insectopia.models.enums.EstadoParticipanteEvento.INSCRITO
            and (:estado is null or e.estado = :estado)
            and (:q is null or lower(e.titulo) like :q escape '!' or lower(e.descripcion) like :q escape '!'
                 or lower(e.ubicacion) like :q escape '!')
            and (:desde is null or e.fechaInicio >= :desde)
            and (:hasta is null or e.fechaInicio < :hasta)
            """)
    Page<Evento> listarParticipaciones(@Param("usuario") Long usuario, @Param("estado") EstadoEvento estado,
            @Param("q") String q, @Param("desde") LocalDateTime desde,
            @Param("hasta") LocalDateTime hasta, Pageable pageable);

    @EntityGraph(attributePaths = "proponente")
    @Query("select e from Evento e where e.idEvento = :id")
    Optional<Evento> obtenerConProponente(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Evento e where e.idEvento = :id")
    Optional<Evento> bloquear(@Param("id") Long id);
}
