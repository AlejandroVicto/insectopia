package com.insectopia.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.Conversacion;
import com.insectopia.models.ParticipanteConversacion;
import com.insectopia.models.ids.ParticipanteConversacionId;

public interface ParticipanteConversacionRepository
        extends JpaRepository<ParticipanteConversacion, ParticipanteConversacionId> {

    // Consultar las conversaciones de un usuario
    Page<ParticipanteConversacion> findByUsuario_IdUsuario(
            Long idUsuario,
            Pageable pageable
    );

    // Consultar conversaciones visibles para un usuario
    Page<ParticipanteConversacion> findByUsuario_IdUsuarioAndOcultaFalse(
            Long idUsuario,
            Pageable pageable
    );

    // Consultar los participantes de una conversación
    Page<ParticipanteConversacion> findByConversacion_IdConversacion(
            Long idConversacion,
            Pageable pageable
    );

    // Verificar si un usuario pertenece a una conversación
    boolean existsByConversacion_IdConversacionAndUsuario_IdUsuario(
            Long idConversacion,
            Long idUsuario
    );

    /**
     * Bandeja de la actividad 064: filtra en base de datos antes de paginar.
     * El orden por última actividad se calcula con subconsulta escalar y se
     * desempata por fecha de creación e id de conversación. El {@code Pageable}
     * solo aporta offset/limit (sin Sort) para no duplicar el ORDER BY.
     */
    @Query(value = """
            select pc from ParticipanteConversacion pc
            join pc.conversacion c
            where pc.usuario.idUsuario = :idUsuario
              and pc.oculta = false
              and (:busqueda is null or exists (
                  select 1 from ParticipanteConversacion otro
                  where otro.conversacion.idConversacion = c.idConversacion
                    and otro.usuario.idUsuario <> :idUsuario
                    and (lower(otro.usuario.nombre) like :busqueda escape '\\'
                         or lower(otro.usuario.nombreUsuario) like :busqueda escape '\\')))
              and (:soloNoLeidos = false or exists (
                  select 1 from Mensaje m
                  where m.conversacion.idConversacion = c.idConversacion
                    and m.remitente.idUsuario <> :idUsuario
                     and (pc.fechaUltimaLectura is null or m.fechaEnvio > pc.fechaUltimaLectura
                          or (m.fechaEnvio = pc.fechaUltimaLectura and pc.idUltimoMensajeLeido is not null
                              and m.idMensaje > pc.idUltimoMensajeLeido))))
            order by (select max(m2.fechaEnvio) from Mensaje m2
                      where m2.conversacion.idConversacion = c.idConversacion) desc,
                     c.fechaCreacion desc,
                     c.idConversacion desc
            """, countQuery = """
            select count(pc) from ParticipanteConversacion pc
            join pc.conversacion c
            where pc.usuario.idUsuario = :idUsuario
              and pc.oculta = false
              and (:busqueda is null or exists (
                  select 1 from ParticipanteConversacion otro
                  where otro.conversacion.idConversacion = c.idConversacion
                    and otro.usuario.idUsuario <> :idUsuario
                    and (lower(otro.usuario.nombre) like :busqueda escape '\\'
                         or lower(otro.usuario.nombreUsuario) like :busqueda escape '\\')))
              and (:soloNoLeidos = false or exists (
                  select 1 from Mensaje m
                  where m.conversacion.idConversacion = c.idConversacion
                    and m.remitente.idUsuario <> :idUsuario
                     and (pc.fechaUltimaLectura is null or m.fechaEnvio > pc.fechaUltimaLectura
                          or (m.fechaEnvio = pc.fechaUltimaLectura and pc.idUltimoMensajeLeido is not null
                              and m.idMensaje > pc.idUltimoMensajeLeido))))
            """)
    Page<ParticipanteConversacion> buscarBandeja(
            @Param("idUsuario") Long idUsuario,
            @Param("busqueda") String busqueda,
            @Param("soloNoLeidos") boolean soloNoLeidos,
            Pageable pageable);

    /** Todos los participantes de las conversaciones de la página, con usuario cargado (sin N+1). */
    @Query("""
            select pc from ParticipanteConversacion pc
            join fetch pc.usuario
            join fetch pc.conversacion
            where pc.conversacion.idConversacion in :ids
            """)
    List<ParticipanteConversacion> findConUsuariosPorConversaciones(
            @Param("ids") Collection<Long> ids);

    /** Participación concreta de un usuario, necesaria para ocultar solo la suya. */
    Optional<ParticipanteConversacion> findByConversacion_IdConversacionAndUsuario_IdUsuario(
            Long idConversacion,
            Long idUsuario);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select pc from ParticipanteConversacion pc where pc.conversacion.idConversacion = :id and pc.usuario.idUsuario = :usuario")
    Optional<ParticipanteConversacion> bloquearParaLectura(@Param("id") Long id, @Param("usuario") Long usuario);

    /** Comprobación de que una conversación directa tiene exactamente dos participantes. */
    long countByConversacion_IdConversacion(Long idConversacion);

    /**
     * Reutiliza conversaciones directas preexistentes aunque su clave no siga el
     * formato generado por 066 (por ejemplo, datos semilla). Exige que ambos
     * ids estén presentes y que no haya un tercer participante.
     */
    @Query("""
            select pc.conversacion from ParticipanteConversacion pc
            where pc.usuario.idUsuario = :idUno
              and exists (
                  select 1 from ParticipanteConversacion otro
                  where otro.conversacion = pc.conversacion
                    and otro.usuario.idUsuario = :idDos)
              and not exists (
                  select 1 from ParticipanteConversacion otro
                  where otro.conversacion = pc.conversacion
                    and otro.usuario.idUsuario not in :ids)
            order by pc.conversacion.idConversacion asc
            """)
    List<Conversacion> findDirectasPorParticipantes(
            @Param("idUno") Long idUno,
            @Param("idDos") Long idDos,
            @Param("ids") Collection<Long> ids);
}
