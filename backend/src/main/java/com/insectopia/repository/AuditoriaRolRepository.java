package com.insectopia.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.AuditoriaRol;

public interface AuditoriaRolRepository extends JpaRepository<AuditoriaRol, Long> {

    // Historial de cambios de rol de un usuario
    Page<AuditoriaRol> findByUsuario_IdUsuarioOrderByFechaCambioDesc(
            Long idUsuario,
            Pageable pageable
    );

    // Cambios de rol realizados por un administrador
    Page<AuditoriaRol> findByAdministrador_IdUsuarioOrderByFechaCambioDesc(
            Long idAdministrador,
            Pageable pageable
    );
}
