package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

import com.insectopia.models.Notificacion;

public interface NotificacionRepository
        extends JpaRepository<Notificacion, Long> {

    // Consultar las notificaciones de un usuario, de la más reciente a la más antigua
    Page<Notificacion> findByDestinatario_IdUsuarioOrderByFechaCreacionDesc(
            Long idUsuario,
            Pageable pageable
    );

    // Consultar únicamente las notificaciones no leídas
    Page<Notificacion> findByDestinatario_IdUsuarioAndLeidaFalseOrderByFechaCreacionDesc(
            Long idUsuario,
            Pageable pageable
    );

    // Contar las notificaciones no leídas de un usuario
    long countByDestinatario_IdUsuarioAndLeidaFalse(
            Long idUsuario
    );

    // Comprobar que una notificación pertenece a un usuario
    boolean existsByIdNotificacionAndDestinatario_IdUsuario(
            Long idNotificacion,
            Long idUsuario
    );

    Page<Notificacion> findByDestinatario_IdUsuario(Long idUsuario, Pageable pageable);

    Page<Notificacion> findByDestinatario_IdUsuarioAndLeida(Long idUsuario, Boolean leida, Pageable pageable);

    Optional<Notificacion> findByIdNotificacionAndDestinatario_IdUsuario(Long id, Long destinatario);

    boolean existsByDestinatario_IdUsuarioAndActor_IdUsuarioAndPublicacion_IdPublicacionAndTipo(
            Long destinatario, Long actor, Long publicacion, String tipo);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Notificacion n set n.leida = true where n.destinatario.idUsuario = :destinatario and n.leida = false")
    int marcarTodasLeidas(@Param("destinatario") Long destinatario);
}
