package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
