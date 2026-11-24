-- ============================================================
-- Insectopia - Migracion V10
-- Tablas: auditoria_roles y limpieza_archivos_pendientes
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- Conserva el historial de cambios de rol y cuando ocurrieron;
-- las referencias a usuarios eliminados quedan NULL.
-- No se insertan datos de prueba en esta migracion.
-- ============================================================

CREATE TABLE auditoria_roles (
    id_auditoria BIGINT NOT NULL AUTO_INCREMENT,
    id_administrador BIGINT NULL,
    id_usuario BIGINT NULL,
    id_rol_anterior BIGINT NOT NULL,
    id_rol_nuevo BIGINT NOT NULL,
    fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_auditoria_roles
        PRIMARY KEY (id_auditoria),

    -- Consultas por administrador, usuario afectado y fecha.
    INDEX idx_auditoria_roles_administrador
        (id_administrador, fecha_cambio),

    INDEX idx_auditoria_roles_usuario
        (id_usuario, fecha_cambio),

    INDEX idx_auditoria_roles_fecha
        (fecha_cambio),

    -- Indices necesarios para las referencias a ambos roles.
    INDEX idx_auditoria_roles_rol_anterior
        (id_rol_anterior),

    INDEX idx_auditoria_roles_rol_nuevo
        (id_rol_nuevo),

    CONSTRAINT fk_auditoria_roles_administrador
        FOREIGN KEY (id_administrador)
        REFERENCES usuarios (id_usuario)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,

    CONSTRAINT fk_auditoria_roles_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,

    CONSTRAINT fk_auditoria_roles_rol_anterior
        FOREIGN KEY (id_rol_anterior)
        REFERENCES roles (id_rol)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_auditoria_roles_rol_nuevo
        FOREIGN KEY (id_rol_nuevo)
        REFERENCES roles (id_rol)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- Cola durable de archivos pendientes de limpieza tras el commit.
CREATE TABLE limpieza_archivos_pendientes (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    CONSTRAINT uk_limpieza_archivo UNIQUE (tipo, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
