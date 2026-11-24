package com.insectopia.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insectopia.models.OAuthRegistroPendiente;

public interface OAuthRegistroPendienteRepository extends JpaRepository<OAuthRegistroPendiente, Long> {

    Optional<OAuthRegistroPendiente> findByTokenHash(String tokenHash);

    Optional<OAuthRegistroPendiente> findBySubject(String subject);

    /**
     * Inserta o renueva de forma atómica la fila de un mismo subject.
     * MySQL devuelve 1 al insertar, 2 al renovar y 0 si la clave duplicada
     * pertenece a otra identidad; en ese caso no se sobrescribe esa fila.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            INSERT INTO oauth_registros_pendientes
                (token_hash, subject, correo, nombre, foto_url, fecha_creacion, fecha_expiracion, fecha_uso)
            VALUES
                (:hash, :subject, :correo, :nombre, :fotoUrl, :fechaCreacion, :fechaExpiracion, NULL)
            ON DUPLICATE KEY UPDATE
                token_hash = IF(subject = VALUES(subject), VALUES(token_hash), token_hash),
                correo = IF(subject = VALUES(subject), VALUES(correo), correo),
                nombre = IF(subject = VALUES(subject), VALUES(nombre), nombre),
                foto_url = IF(subject = VALUES(subject), VALUES(foto_url), foto_url),
                fecha_creacion = IF(subject = VALUES(subject), VALUES(fecha_creacion), fecha_creacion),
                fecha_expiracion = IF(subject = VALUES(subject), VALUES(fecha_expiracion), fecha_expiracion),
                fecha_uso = IF(subject = VALUES(subject), NULL, fecha_uso)
            """, nativeQuery = true)
    int guardarORenovar(@Param("hash") String hash, @Param("subject") String subject,
            @Param("correo") String correo, @Param("nombre") String nombre,
            @Param("fotoUrl") String fotoUrl, @Param("fechaCreacion") LocalDateTime fechaCreacion,
            @Param("fechaExpiracion") LocalDateTime fechaExpiracion);

    @Modifying
    @Query("""
            update OAuthRegistroPendiente r
               set r.fechaUso = :ahora
             where r.tokenHash = :hash
               and r.fechaUso is null
               and r.fechaExpiracion > :ahora
            """)
    int consumir(@Param("hash") String hash, @Param("ahora") LocalDateTime ahora);
}
