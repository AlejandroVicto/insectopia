package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
