package com.insectopia.repository;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.TokenRevocado;

public interface TokenRevocadoRepository
        extends JpaRepository<TokenRevocado, String> {

    // Verificar si un token JWT fue revocado
    boolean existsByJti(String jti);

    // MySQL's primary key makes concurrent requests for the same JWT idempotent.
    @Modifying
    @Query(value = "INSERT INTO tokens_revocados (jti, id_usuario, fecha_revocacion, fecha_expiracion) "
            + "VALUES (:jti, :userId, :revokedAt, :expiresAt) "
            + "ON DUPLICATE KEY UPDATE jti = jti", nativeQuery = true)
    int revokeIfAbsent(@Param("jti") String jti, @Param("userId") Long userId,
            @Param("revokedAt") LocalDateTime revokedAt, @Param("expiresAt") LocalDateTime expiresAt);

    // Contar los tokens revocados de un usuario
    long countByUsuario_IdUsuario(Long idUsuario);

    // Eliminar registros de tokens cuya vigencia haya terminado
    long deleteByFechaExpiracionBefore(LocalDateTime fechaActual);
}
