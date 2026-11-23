package com.insectopia.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.TokenRecuperacion;

import jakarta.persistence.LockModeType;

public interface TokenRecuperacionRepository
        extends JpaRepository<TokenRecuperacion, Long> {

    // Buscar un token mediante su hash
    Optional<TokenRecuperacion> findByTokenHash(String tokenHash);

    // Buscar un token que no haya sido utilizado y que no esté vencido
    Optional<TokenRecuperacion> findByTokenHashAndFechaUsoIsNullAndFechaExpiracionAfter(
            String tokenHash,
            LocalDateTime fechaActual);

    // Consultar si un usuario tiene tokens pendientes de utilizar
    boolean existsByUsuario_IdUsuarioAndFechaUsoIsNullAndFechaExpiracionAfter(
            Long idUsuario,
            LocalDateTime fechaActual);

    /** Sólo el identificador: permite bloquear primero la cuenta y evitar interbloqueos. */
    @Query("select t.usuario.idUsuario from TokenRecuperacion t where t.tokenHash = :hash")
    Optional<Long> idUsuarioPorHash(@Param("hash") String hash);

    /** Bloqueo pesimista de la fila: garantiza un único consumo concurrente. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TokenRecuperacion t where t.tokenHash = :hash")
    Optional<TokenRecuperacion> bloquearPorHash(@Param("hash") String hash);

    /** Invalida los enlaces pendientes al emitir uno nuevo o al cambiar la contraseña. */
    @Modifying
    @Query("""
            update TokenRecuperacion t set t.fechaUso = :ahora
            where t.usuario.idUsuario = :idUsuario
              and t.fechaUso is null
              and t.idToken <> :excepto
            """)
    int invalidarPendientes(@Param("idUsuario") Long idUsuario,
            @Param("ahora") LocalDateTime ahora,
            @Param("excepto") Long excepto);
}
