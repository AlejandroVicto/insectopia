-- ============================================================
-- Insectopia - Migracion V4
-- Tablas: conversaciones, participantes_conversacion y mensajes
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- No se insertan datos de prueba en esta migracion.
-- El limite de dos participantes por conversacion directa
-- se valida posteriormente desde Spring Boot.
-- ============================================================

CREATE TABLE conversaciones (
    id_conversacion BIGINT NOT NULL AUTO_INCREMENT,
    clave_directa VARCHAR(45) NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_conversaciones
        PRIMARY KEY (id_conversacion),

    CONSTRAINT uk_conversaciones_clave_directa
        UNIQUE (clave_directa)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE participantes_conversacion (
    id_conversacion BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL,
    fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_ultima_lectura DATETIME NULL,
    oculta BOOLEAN NOT NULL DEFAULT FALSE,
    -- Desempate de mensajes con la misma fecha; NULL conserva la semantica de lectura anterior.
    id_ultimo_mensaje_leido BIGINT NULL,

    CONSTRAINT pk_participantes_conversacion
        PRIMARY KEY (id_conversacion, id_usuario),

    INDEX idx_participantes_conversacion_usuario
        (id_usuario, id_conversacion),

    CONSTRAINT fk_participantes_conversacion_conversaciones
        FOREIGN KEY (id_conversacion)
        REFERENCES conversaciones (id_conversacion)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_participantes_conversacion_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE mensajes (
    id_mensaje BIGINT NOT NULL AUTO_INCREMENT,
    id_conversacion BIGINT NOT NULL,
    id_remitente BIGINT NOT NULL,
    contenido TEXT NOT NULL,
    fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_mensajes
        PRIMARY KEY (id_mensaje),

    -- Historial ordenado de cada conversacion.
    INDEX idx_mensajes_conversacion_fecha
        (id_conversacion, fecha_envio, id_mensaje),

    -- Indice requerido por la FK compuesta.
    INDEX idx_mensajes_participante
        (id_conversacion, id_remitente),

    CONSTRAINT fk_mensajes_conversacion
        FOREIGN KEY (id_conversacion)
        REFERENCES conversaciones (id_conversacion)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_mensajes_remitente
        FOREIGN KEY (id_remitente)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    -- Garantiza que el remitente pertenece a la conversacion.
    CONSTRAINT fk_mensajes_participante
        FOREIGN KEY (id_conversacion, id_remitente)
        REFERENCES participantes_conversacion (id_conversacion, id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
