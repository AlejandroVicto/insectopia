-- ============================================================
-- Insectopia - Migracion V7
-- Tabla: reportes
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- No se insertan datos de prueba en esta migracion.
-- Las reglas referenciales RESTRICT impiden destruir el
-- historial de reportes al eliminar usuarios o publicaciones.
-- ============================================================

CREATE TABLE reportes (
    id_reporte BIGINT NOT NULL AUTO_INCREMENT,
    id_reportante BIGINT NOT NULL,
    id_publicacion BIGINT NOT NULL,
    id_moderador BIGINT NULL,
    motivo VARCHAR(100) NOT NULL,
    descripcion VARCHAR(500) NULL,

    estado ENUM(
        'PENDIENTE',
        'EN_REVISION',
        'RESUELTO',
        'RECHAZADO'
    ) NOT NULL DEFAULT 'PENDIENTE',

    resolucion VARCHAR(500) NULL,
    fecha_reporte DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME NULL,

    CONSTRAINT pk_reportes
        PRIMARY KEY (id_reporte),

    INDEX idx_reportes_estado_fecha
        (estado, fecha_reporte),

    INDEX idx_reportes_publicacion
        (id_publicacion, fecha_reporte),

    INDEX idx_reportes_reportante
        (id_reportante, fecha_reporte),

    CONSTRAINT fk_reportes_reportante
        FOREIGN KEY (id_reportante)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_reportes_publicacion
        FOREIGN KEY (id_publicacion)
        REFERENCES publicaciones (id_publicacion)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_reportes_moderador
        FOREIGN KEY (id_moderador)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- Ahora que reportes existe, se completa la relacion pendiente
-- de notificaciones. Si el reporte se elimina, el aviso se
-- conserva sin enlace.
ALTER TABLE notificaciones
    ADD CONSTRAINT fk_notificaciones_reporte
        FOREIGN KEY (id_reporte)
        REFERENCES reportes (id_reporte)
        ON DELETE SET NULL
        ON UPDATE RESTRICT;
