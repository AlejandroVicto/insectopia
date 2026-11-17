-- ============================================================
-- Insectopia - Migracion V2
-- Tabla: seguidores
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- Relaciona a los usuarios que siguen a otros usuarios.
-- No se insertan datos de prueba en esta migracion.
-- ============================================================

CREATE TABLE seguidores (
    id_seguidor BIGINT NOT NULL,
    id_seguido BIGINT NOT NULL,
    fecha_seguimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_seguidores
        PRIMARY KEY (id_seguidor, id_seguido),

    -- Sin ON DELETE/ON UPDATE: MySQL 8.4 prohibe acciones
    -- referenciales explicitas en columnas usadas por CHECK.
    CONSTRAINT fk_seguidores_usuario_seguidor
        FOREIGN KEY (id_seguidor)
        REFERENCES usuarios (id_usuario),

    CONSTRAINT fk_seguidores_usuario_seguido
        FOREIGN KEY (id_seguido)
        REFERENCES usuarios (id_usuario),

    CONSTRAINT chk_seguidores_no_auto_seguimiento
        CHECK (id_seguidor <> id_seguido),

    INDEX idx_seguidores_id_seguido (id_seguido)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
