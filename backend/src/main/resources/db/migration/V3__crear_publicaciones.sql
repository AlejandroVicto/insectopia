-- ============================================================
-- Insectopia - Migracion V3
-- Tablas: publicaciones, comentarios y reacciones
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- No se insertan datos de prueba en esta migracion.
-- Las publicaciones utilizan borrado logico mediante estado.
-- ============================================================

CREATE TABLE publicaciones (
    id_publicacion BIGINT NOT NULL AUTO_INCREMENT,
    id_usuario BIGINT NOT NULL,
    contenido TEXT NOT NULL,
    imagen VARCHAR(500) NULL,

    estado ENUM(
        'VISIBLE',
        'OCULTA',
        'ELIMINADA'
    ) NOT NULL DEFAULT 'VISIBLE',

    fecha_publicacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_publicaciones
        PRIMARY KEY (id_publicacion),

    INDEX idx_publicaciones_feed
        (estado, fecha_publicacion),

    INDEX idx_publicaciones_usuario
        (id_usuario, fecha_publicacion),

    CONSTRAINT fk_publicaciones_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE comentarios (
    id_comentario BIGINT NOT NULL AUTO_INCREMENT,
    id_publicacion BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL,
    contenido TEXT NOT NULL,

    fecha_comentario DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_comentarios
        PRIMARY KEY (id_comentario),

    INDEX idx_comentarios_publicacion
        (id_publicacion, fecha_comentario),

    INDEX idx_comentarios_usuario
        (id_usuario, fecha_comentario),

    CONSTRAINT fk_comentarios_publicaciones
        FOREIGN KEY (id_publicacion)
        REFERENCES publicaciones (id_publicacion)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_comentarios_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE reacciones (
    id_reaccion BIGINT NOT NULL AUTO_INCREMENT,
    id_publicacion BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'ME_GUSTA',

    fecha_reaccion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_reacciones
        PRIMARY KEY (id_reaccion),

    CONSTRAINT uk_reacciones_publicacion_usuario
        UNIQUE (id_publicacion, id_usuario),

    INDEX idx_reacciones_usuario
        (id_usuario, fecha_reaccion),

    CONSTRAINT fk_reacciones_publicaciones
        FOREIGN KEY (id_publicacion)
        REFERENCES publicaciones (id_publicacion)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_reacciones_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
