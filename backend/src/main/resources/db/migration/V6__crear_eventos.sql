-- ============================================================
-- Insectopia - Migracion V6
-- Tablas: eventos y participantes_evento
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- No se insertan datos de prueba en esta migracion.
-- La aprobacion de propuestas y el control de cupos se
-- implementan posteriormente desde Spring Boot.
-- ============================================================

CREATE TABLE eventos (
    id_evento BIGINT NOT NULL AUTO_INCREMENT,
    id_proponente BIGINT NOT NULL,
    id_moderador BIGINT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    ubicacion VARCHAR(255) NOT NULL,
    imagen VARCHAR(500) NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    cupo_maximo INT NOT NULL,

    estado ENUM(
        'PENDIENTE',
        'APROBADO',
        'RECHAZADO',
        'CANCELADO'
    ) NOT NULL DEFAULT 'PENDIENTE',

    motivo_resolucion VARCHAR(500) NULL,
    fecha_resolucion DATETIME NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_eventos
        PRIMARY KEY (id_evento),

    CONSTRAINT chk_eventos_cupo_positivo
        CHECK (cupo_maximo > 0),

    CONSTRAINT chk_eventos_fechas
        CHECK (fecha_fin >= fecha_inicio),

    INDEX idx_eventos_estado_fecha
        (estado, fecha_inicio),

    INDEX idx_eventos_fechas
        (fecha_inicio, fecha_fin),

    INDEX idx_eventos_proponente
        (id_proponente, fecha_creacion),

    CONSTRAINT fk_eventos_proponente
        FOREIGN KEY (id_proponente)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_eventos_moderador
        FOREIGN KEY (id_moderador)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE participantes_evento (
    id_evento BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL,
    fecha_inscripcion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    estado ENUM(
        'INSCRITO',
        'CANCELADO'
    ) NOT NULL DEFAULT 'INSCRITO',

    fecha_cancelacion DATETIME NULL,

    CONSTRAINT pk_participantes_evento
        PRIMARY KEY (id_evento, id_usuario),

    CONSTRAINT chk_participantes_evento_cancelacion
        CHECK (
            fecha_cancelacion IS NULL
            OR fecha_cancelacion >= fecha_inscripcion
        ),

    INDEX idx_participantes_evento_usuario
        (id_usuario, estado, fecha_inscripcion),

    CONSTRAINT fk_participantes_evento_eventos
        FOREIGN KEY (id_evento)
        REFERENCES eventos (id_evento)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_participantes_evento_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- Ahora que eventos existe, se completa la relacion pendiente
-- de notificaciones. Si el evento se elimina, el aviso se
-- conserva sin enlace.
ALTER TABLE notificaciones
    ADD CONSTRAINT fk_notificaciones_evento
        FOREIGN KEY (id_evento)
        REFERENCES eventos (id_evento)
        ON DELETE SET NULL
        ON UPDATE RESTRICT;
