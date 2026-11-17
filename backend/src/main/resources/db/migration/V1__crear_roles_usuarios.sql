-- ============================================================
-- Insectopia - Migracion V1
-- Tablas: roles y usuarios
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- Esta migracion solo crea la estructura.
-- Los roles se insertan en V9 y los usuarios de prueba se
-- cargan mediante los seeders.
-- ============================================================

CREATE TABLE roles (
    id_rol BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(30) NOT NULL,
    descripcion VARCHAR(255) NULL,

    CONSTRAINT pk_roles
        PRIMARY KEY (id_rol),

    CONSTRAINT uk_roles_nombre
        UNIQUE (nombre)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE usuarios (
    id_usuario BIGINT NOT NULL AUTO_INCREMENT,
    id_rol BIGINT NOT NULL,

    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,

    telefono VARCHAR(20) NULL,
    biografia VARCHAR(500) NULL,
    foto_perfil VARCHAR(500) NULL,
    foto_portada VARCHAR(500) NULL,

    estado ENUM(
        'ACTIVO',
        'BLOQUEADO',
        'DESACTIVADO'
    ) NOT NULL DEFAULT 'ACTIVO',

    recibir_sms BOOLEAN NOT NULL DEFAULT FALSE,
    recibir_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
    version_token INT NOT NULL DEFAULT 0,

    fecha_registro DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuarios
        PRIMARY KEY (id_usuario),

    CONSTRAINT uk_usuarios_correo
        UNIQUE (correo),

    CONSTRAINT fk_usuarios_roles
        FOREIGN KEY (id_rol)
        REFERENCES roles (id_rol)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT chk_usuarios_version_token
        CHECK (version_token >= 0),

    INDEX idx_usuarios_id_rol (id_rol),
    INDEX idx_usuarios_estado_fecha
        (estado, fecha_registro)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
