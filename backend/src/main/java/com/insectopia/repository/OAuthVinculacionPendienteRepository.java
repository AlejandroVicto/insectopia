package com.insectopia.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.OAuthVinculacionPendiente;

public interface OAuthVinculacionPendienteRepository extends JpaRepository<OAuthVinculacionPendiente, Long> {

    Optional<OAuthVinculacionPendiente> findByTokenHash(String tokenHash);

    @Modifying
    @Query("""
            update OAuthVinculacionPendiente v
               set v.subject = :subject
             where v.tokenHash = :hash
               and v.subject is null
               and v.fechaUso is null
               and v.fechaExpiracion > :ahora
            """)
    int fijarSubject(@Param("hash") String hash, @Param("subject") String subject,
            @Param("ahora") LocalDateTime ahora);

    @Modifying
    @Query("""
            update OAuthVinculacionPendiente v
               set v.fechaUso = :ahora
             where v.tokenHash = :hash
               and v.fechaUso is null
               and v.fechaExpiracion > :ahora
            """)
    int consumir(@Param("hash") String hash, @Param("ahora") LocalDateTime ahora);
}
