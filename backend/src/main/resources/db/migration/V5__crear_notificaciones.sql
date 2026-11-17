-- ============================================================
-- Insectopia - Migracion V5
-- Tabla: notificaciones
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- No se insertan datos de prueba en esta migracion.
-- Las columnas id_evento e id_reporte se crean sin FK porque
-- eventos y reportes se crean en V6 y V7 respectivamente.
-- ============================================================

CREATE TABLE notificaciones (
    id_notificacion BIGINT NOT NULL AUTO_INCREMENT,
    id_destinatario BIGINT NOT NULL,
    id_actor BIGINT NULL,
    id_publicacion BIGINT NULL,
    id_evento BIGINT NULL,
    id_mensaje BIGINT NULL,
    id_reporte BIGINT NULL,
    tipo VARCHAR(40) NOT NULL,
    contenido VARCHAR(500) NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_notificaciones
        PRIMARY KEY (id_notificacion),

    INDEX idx_notificaciones_destinatario
        (id_destinatario, leida, fecha_creacion),

    CONSTRAINT fk_notificaciones_destinatario
        FOREIGN KEY (id_destinatario)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    -- Referencias opcionales: si el recurso se elimina, el aviso
    -- se conserva sin enlace.
    CONSTRAINT fk_notificaciones_actor
        FOREIGN KEY (id_actor)
        REFERENCES usuarios (id_usuario)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,

    CONSTRAINT fk_notificaciones_publicacion
        FOREIGN KEY (id_publicacion)
        REFERENCES publicaciones (id_publicacion)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,

    CONSTRAINT fk_notificaciones_mensaje
        FOREIGN KEY (id_mensaje)
        REFERENCES mensajes (id_mensaje)
        ON DELETE SET NULL
        ON UPDATE RESTRICT

    -- id_evento: su FK se agrega en V6.
    -- id_reporte: su FK se agrega en V7.
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
