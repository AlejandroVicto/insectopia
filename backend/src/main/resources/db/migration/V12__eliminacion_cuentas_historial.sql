-- La eliminación física conserva los registros históricos sin FK colgantes.
-- Los campos desligados quedan NULL; no se guardan nombres, correos ni IDs de cuentas borradas.
ALTER TABLE auditoria_roles DROP FOREIGN KEY fk_auditoria_roles_administrador;
ALTER TABLE auditoria_roles DROP FOREIGN KEY fk_auditoria_roles_usuario;
ALTER TABLE auditoria_roles MODIFY id_administrador BIGINT NULL, MODIFY id_usuario BIGINT NULL;
ALTER TABLE auditoria_roles ADD CONSTRAINT fk_auditoria_roles_administrador FOREIGN KEY (id_administrador)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE auditoria_roles ADD CONSTRAINT fk_auditoria_roles_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE reportes DROP FOREIGN KEY fk_reportes_reportante;
ALTER TABLE reportes DROP FOREIGN KEY fk_reportes_publicacion;
ALTER TABLE reportes DROP FOREIGN KEY fk_reportes_moderador;
ALTER TABLE reportes MODIFY id_reportante BIGINT NULL, MODIFY id_publicacion BIGINT NULL;
ALTER TABLE reportes ADD CONSTRAINT fk_reportes_reportante FOREIGN KEY (id_reportante)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE reportes ADD CONSTRAINT fk_reportes_publicacion FOREIGN KEY (id_publicacion)
    REFERENCES publicaciones (id_publicacion) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE reportes ADD CONSTRAINT fk_reportes_moderador FOREIGN KEY (id_moderador)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE eventos DROP FOREIGN KEY fk_eventos_proponente;
ALTER TABLE eventos DROP FOREIGN KEY fk_eventos_moderador;
ALTER TABLE eventos MODIFY id_proponente BIGINT NULL;
ALTER TABLE eventos ADD CONSTRAINT fk_eventos_proponente FOREIGN KEY (id_proponente)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE eventos ADD CONSTRAINT fk_eventos_moderador FOREIGN KEY (id_moderador)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE RESTRICT;

-- Comentarios/reacciones de terceros permanecen como registros históricos sin publicación.
ALTER TABLE comentarios DROP FOREIGN KEY fk_comentarios_publicaciones;
ALTER TABLE comentarios MODIFY id_publicacion BIGINT NULL;
ALTER TABLE comentarios ADD CONSTRAINT fk_comentarios_publicaciones FOREIGN KEY (id_publicacion)
    REFERENCES publicaciones (id_publicacion) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE reacciones DROP FOREIGN KEY fk_reacciones_publicaciones;
ALTER TABLE reacciones MODIFY id_publicacion BIGINT NULL;
ALTER TABLE reacciones ADD CONSTRAINT fk_reacciones_publicaciones FOREIGN KEY (id_publicacion)
    REFERENCES publicaciones (id_publicacion) ON DELETE SET NULL ON UPDATE RESTRICT;

-- Cola durable: si falla la limpieza de un archivo después del commit, se reintenta sin perder la ruta.
CREATE TABLE limpieza_archivos_pendientes (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    CONSTRAINT uk_limpieza_archivo UNIQUE (tipo, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
