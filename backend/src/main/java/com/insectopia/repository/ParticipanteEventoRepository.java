package com.insectopia.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.ParticipanteEvento;
import com.insectopia.models.ids.ParticipanteEventoId;
import com.insectopia.models.enums.EstadoParticipanteEvento;

public interface ParticipanteEventoRepository
        extends JpaRepository<ParticipanteEvento, ParticipanteEventoId> {

    // Consultar participantes de un evento
    Page<ParticipanteEvento> findByEvento_IdEvento(
            Long idEvento,
            Pageable pageable
    );

    // Consultar eventos en los que participa un usuario
    Page<ParticipanteEvento> findByUsuario_IdUsuario(
            Long idUsuario,
            Pageable pageable
    );

    // Consultar participantes de un evento según su estado
    Page<ParticipanteEvento> findByEvento_IdEventoAndEstado(
            Long idEvento,
            EstadoParticipanteEvento estado,
            Pageable pageable
    );

    // Comprobar si un usuario tiene una inscripción registrada
    boolean existsByEvento_IdEventoAndUsuario_IdUsuario(
            Long idEvento,
            Long idUsuario
    );

    // Contar participantes de un evento según su estado
    long countByEvento_IdEventoAndEstado(
            Long idEvento,
            EstadoParticipanteEvento estado
    );

    interface ConteoEvento {
        Long getIdEvento();
        Long getTotal();
    }

    interface EstadoUsuarioEvento {
        Long getIdEvento();
        EstadoParticipanteEvento getEstado();
    }

    @Query("select p.evento.idEvento as idEvento, count(p) as total from ParticipanteEvento p "
            + "where p.evento.idEvento in :ids and p.estado = :estado group by p.evento.idEvento")
    List<ConteoEvento> contarActivos(@Param("ids") Collection<Long> ids,
            @Param("estado") EstadoParticipanteEvento estado);

    @Query("select p.evento.idEvento as idEvento, p.estado as estado from ParticipanteEvento p "
            + "where p.evento.idEvento in :ids and p.usuario.idUsuario = :usuario")
    List<EstadoUsuarioEvento> estadosDelUsuario(@Param("ids") Collection<Long> ids, @Param("usuario") Long usuario);
}
