package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
