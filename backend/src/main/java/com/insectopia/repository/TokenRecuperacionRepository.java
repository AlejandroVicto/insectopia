package com.insectopia.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.TokenRecuperacion;

public interface TokenRecuperacionRepository
        extends JpaRepository<TokenRecuperacion, Long> {

    // Buscar un token mediante su hash
    Optional<TokenRecuperacion> findByTokenHash(
            String tokenHash
    );

    // Buscar un token que no haya sido utilizado y que no esté vencido
    Optional<TokenRecuperacion> findByTokenHashAndFechaUsoIsNullAndFechaExpiracionAfter(
            String tokenHash,
            LocalDateTime fechaActual
    );

    // Consultar si un usuario tiene tokens pendientes de utilizar
    boolean existsByUsuario_IdUsuarioAndFechaUsoIsNullAndFechaExpiracionAfter(
            Long idUsuario,
            LocalDateTime fechaActual
    );
}
