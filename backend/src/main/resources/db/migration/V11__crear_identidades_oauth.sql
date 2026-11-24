-- ============================================================
-- Insectopia - Migracion V11
-- Google OAuth 2.0 / OpenID Connect
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- Esta migracion es aditiva. No modifica V1-V10 ni datos existentes.
-- Solo los tokens opacos se guardan como hash SHA-256; nunca se
-- almacenan JWT, tokens de Google, secretos ni contrasenas en claro.
-- ============================================================

ALTER TABLE usuarios
    ADD COLUMN acceso_local_valido TINYINT(1) NOT NULL DEFAULT 1
    AFTER contrasena;


CREATE TABLE identidades_oauth (
    id_identidad BIGINT NOT NULL AUTO_INCREMENT,
    id_usuario BIGINT NOT NULL,
    proveedor VARCHAR(20) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    fecha_vinculacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_identidades_oauth
        PRIMARY KEY (id_identidad),

    CONSTRAINT uk_identidades_oauth_proveedor_subject
        UNIQUE (proveedor, subject),

    CONSTRAINT uk_identidades_oauth_proveedor_usuario
        UNIQUE (proveedor, id_usuario),

    INDEX idx_identidades_oauth_usuario
        (id_usuario),

    CONSTRAINT fk_identidades_oauth_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE oauth_codigos_intercambio (
    id_intercambio BIGINT NOT NULL AUTO_INCREMENT,
    codigo_hash CHAR(64) NOT NULL,
    estado VARCHAR(40) NOT NULL,
    id_usuario BIGINT NULL,
    subject VARCHAR(255) NULL,
    correo VARCHAR(150) NULL,
    nombre VARCHAR(100) NULL,
    foto_url VARCHAR(500) NULL,
    id_registro BIGINT NULL,
    origen VARCHAR(20) NULL,
    codigo_error VARCHAR(50) NULL,
    mensaje VARCHAR(255) NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    fecha_uso DATETIME NULL,

    CONSTRAINT pk_oauth_codigos_intercambio
        PRIMARY KEY (id_intercambio),

    CONSTRAINT uk_oauth_codigos_intercambio_hash
        UNIQUE (codigo_hash),

    INDEX idx_oauth_codigos_intercambio_expiracion
        (fecha_expiracion),
    INDEX idx_oauth_codigos_intercambio_usuario
        (id_usuario),

    CONSTRAINT fk_oauth_codigos_intercambio_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE oauth_registros_pendientes (
    id_registro BIGINT NOT NULL AUTO_INCREMENT,
    token_hash CHAR(64) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    foto_url VARCHAR(500) NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    fecha_uso DATETIME NULL,

    CONSTRAINT pk_oauth_registros_pendientes
        PRIMARY KEY (id_registro),

    CONSTRAINT uk_oauth_registros_pendientes_token
        UNIQUE (token_hash),
    CONSTRAINT uk_oauth_registros_pendientes_subject
        UNIQUE (subject),
    CONSTRAINT uk_oauth_registros_pendientes_correo
        UNIQUE (correo),

    INDEX idx_oauth_registros_pendientes_expiracion
        (fecha_expiracion)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE oauth_vinculaciones_pendientes (
    id_vinculacion BIGINT NOT NULL AUTO_INCREMENT,
    token_hash CHAR(64) NOT NULL,
    id_usuario BIGINT NOT NULL,
    subject VARCHAR(255) NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    fecha_uso DATETIME NULL,

    CONSTRAINT pk_oauth_vinculaciones_pendientes
        PRIMARY KEY (id_vinculacion),

    CONSTRAINT uk_oauth_vinculaciones_pendientes_token
        UNIQUE (token_hash),

    INDEX idx_oauth_vinculaciones_pendientes_expiracion
        (fecha_expiracion),
    INDEX idx_oauth_vinculaciones_pendientes_usuario
        (id_usuario),

    CONSTRAINT fk_oauth_vinculaciones_pendientes_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
