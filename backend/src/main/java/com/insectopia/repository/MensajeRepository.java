package com.insectopia.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.Mensaje;

public interface MensajeRepository
        extends JpaRepository<Mensaje, Long> {

    // Consultar mensajes de una conversación, del más reciente al más antiguo
    Page<Mensaje> findByConversacion_IdConversacionOrderByFechaEnvioDesc(
            Long idConversacion,
            Pageable pageable
    );

    // Consultar mensajes enviados por un usuario
    Page<Mensaje> findByRemitente_IdUsuarioOrderByFechaEnvioDesc(
            Long idUsuario,
            Pageable pageable
    );

    // Contar los mensajes de una conversación
    long countByConversacion_IdConversacion(
            Long idConversacion
    );

    // Obtener el último mensaje de una conversación
    java.util.Optional<Mensaje> findFirstByConversacion_IdConversacionOrderByFechaEnvioDesc(
            Long idConversacion
    );

    /**
     * Historial 064: desempate obligatorio por id para que la paginación por offset sea estable.
     */
    Page<Mensaje> findByConversacion_IdConversacionOrderByFechaEnvioDescIdMensajeDesc(
            Long idConversacion,
            Pageable pageable
    );

    /**
     * Último mensaje de varias conversaciones en una sola consulta (evita N+1 en la bandeja).
     * El desempate por id replica el orden del historial.
     */
    @Query("""
            select m from Mensaje m
            where m.conversacion.idConversacion in :ids
              and not exists (
                  select 1 from Mensaje m2
                  where m2.conversacion.idConversacion = m.conversacion.idConversacion
                    and (m2.fechaEnvio > m.fechaEnvio
                         or (m2.fechaEnvio = m.fechaEnvio and m2.idMensaje > m.idMensaje)))
            """)
    List<Mensaje> findUltimosPorConversacion(@Param("ids") Collection<Long> ids);

    /**
     * No leídos por conversación: mensajes de otros remitentes posteriores a
     * {@code fechaUltimaLectura}; el ID desempata fechas iguales para lecturas nuevas.
     * Las lecturas históricas sin ID conservan su comportamiento anterior.
     */
    @Query("""
            select pc.conversacion.idConversacion as conversacionId,
                   (select count(m) from Mensaje m
                    where m.conversacion.idConversacion = pc.conversacion.idConversacion
                      and m.remitente.idUsuario <> pc.usuario.idUsuario
                       and (pc.fechaUltimaLectura is null or m.fechaEnvio > pc.fechaUltimaLectura
                            or (m.fechaEnvio = pc.fechaUltimaLectura and pc.idUltimoMensajeLeido is not null
                                and m.idMensaje > pc.idUltimoMensajeLeido))) as total
            from ParticipanteConversacion pc
            where pc.usuario.idUsuario = :idUsuario
              and pc.conversacion.idConversacion in :ids
            """)
    List<ConteoNoLeidosProjection> contarNoLeidos(
            @Param("idUsuario") Long idUsuario,
            @Param("ids") Collection<Long> ids);

    Optional<Mensaje> findByIdMensajeAndConversacion_IdConversacion(Long idMensaje, Long idConversacion);
}
