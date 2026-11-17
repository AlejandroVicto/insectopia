-- ============================================================
-- Insectopia - Migracion V8
-- Tablas: tokens_recuperacion y tokens_revocados
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- No se insertan datos de prueba en esta migracion.
-- No se almacenan contrasenas, tokens de recuperacion ni JWT
-- completos en texto plano: solo el hash SHA-256 de 64
-- caracteres y el jti del JWT.
-- ============================================================

CREATE TABLE tokens_recuperacion (
    id_token BIGINT NOT NULL AUTO_INCREMENT,
    id_usuario BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    fecha_uso DATETIME NULL,

    CONSTRAINT pk_tokens_recuperacion
        PRIMARY KEY (id_token),

    CONSTRAINT uk_tokens_recuperacion_hash
        UNIQUE (token_hash),

    INDEX idx_tokens_recuperacion_usuario
        (id_usuario, fecha_expiracion),

    INDEX idx_tokens_recuperacion_expiracion
        (fecha_expiracion),

    CONSTRAINT fk_tokens_recuperacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE tokens_revocados (
    jti CHAR(36) NOT NULL,
    id_usuario BIGINT NOT NULL,
    fecha_revocacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,

    CONSTRAINT pk_tokens_revocados
        PRIMARY KEY (jti),

    INDEX idx_tokens_revocados_usuario
        (id_usuario, fecha_expiracion),

    INDEX idx_tokens_revocados_expiracion
        (fecha_expiracion),

    CONSTRAINT fk_tokens_revocados_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
