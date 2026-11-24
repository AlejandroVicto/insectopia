package com.insectopia.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.OAuthCodigoIntercambio;

public interface OAuthCodigoIntercambioRepository extends JpaRepository<OAuthCodigoIntercambio, Long> {

    Optional<OAuthCodigoIntercambio> findByCodigoHash(String codigoHash);

    @Modifying
    @Query("""
            update OAuthCodigoIntercambio c
               set c.fechaUso = :ahora
             where c.codigoHash = :hash
               and c.fechaUso is null
               and c.fechaExpiracion > :ahora
            """)
    int consumir(@Param("hash") String hash, @Param("ahora") LocalDateTime ahora);
}
