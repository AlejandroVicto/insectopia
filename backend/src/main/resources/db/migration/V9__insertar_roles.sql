-- ============================================================
-- Insectopia - Migracion V9
-- Datos: roles de referencia
-- Motor: InnoDB | Charset: utf8mb4
-- Compatible con MySQL 8.4 y Flyway
--
-- Solo se insertan los tres roles fijos del sistema.
-- No se insertan usuarios ni contrasenas de prueba.
-- ============================================================

INSERT INTO roles (nombre, descripcion)
VALUES
    ('ADMINISTRADOR', 'Gestion total de la plataforma'),
    ('MODERADOR', 'Aprobacion de eventos y gestion de reportes'),
    ('USUARIO', 'Funciones generales de la red social');
