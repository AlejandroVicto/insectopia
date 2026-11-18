package com.insectopia.repository;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.TokenRevocado;

public interface TokenRevocadoRepository
        extends JpaRepository<TokenRevocado, String> {

    // Verificar si un token JWT fue revocado
    boolean existsByJti(String jti);

    // Contar los tokens revocados de un usuario
    long countByUsuario_IdUsuario(Long idUsuario);

    // Eliminar registros de tokens cuya vigencia haya terminado
    long deleteByFechaExpiracionBefore(LocalDateTime fechaActual);
}
