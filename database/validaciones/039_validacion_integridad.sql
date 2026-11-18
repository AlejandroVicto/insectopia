-- ============================================================================
-- INSECTOPIA | Actividad 039: Validacion de integridad de la base de datos
-- Motor: MySQL 8.4 | Herramienta: DBeaver
-- Objetivo: verificar cantidades, usuarios, seguridad e integridad referencial.
-- Este script es de SOLO LECTURA: no modifica ninguna tabla.
-- Base de referencia: 288 registros (incluye los 3 roles de Flyway).
-- Las consultas pueden ejecutarse todas juntas o por secciones.
-- ============================================================================

USE insectopia;

-- 01. Conteo de registros por tabla (288 en total; tres tablas vacias)
SELECT 'roles' AS tabla, COUNT(*) AS registros FROM roles
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'publicaciones', COUNT(*) FROM publicaciones
UNION ALL SELECT 'comentarios', COUNT(*) FROM comentarios
UNION ALL SELECT 'reacciones', COUNT(*) FROM reacciones
UNION ALL SELECT 'conversaciones', COUNT(*) FROM conversaciones
UNION ALL SELECT 'participantes_conversacion', COUNT(*) FROM participantes_conversacion
UNION ALL SELECT 'mensajes', COUNT(*) FROM mensajes
UNION ALL SELECT 'eventos', COUNT(*) FROM eventos
UNION ALL SELECT 'participantes_evento', COUNT(*) FROM participantes_evento
UNION ALL SELECT 'seguidores', COUNT(*) FROM seguidores
UNION ALL SELECT 'notificaciones', COUNT(*) FROM notificaciones
UNION ALL SELECT 'reportes', COUNT(*) FROM reportes
UNION ALL SELECT 'tokens_recuperacion', COUNT(*) FROM tokens_recuperacion
UNION ALL SELECT 'tokens_revocados', COUNT(*) FROM tokens_revocados
UNION ALL SELECT 'auditoria_roles', COUNT(*) FROM auditoria_roles;

-- Suma global para comprobar los 288 registros esperados.
SELECT
    (SELECT COUNT(*) FROM roles)
  + (SELECT COUNT(*) FROM usuarios)
  + (SELECT COUNT(*) FROM publicaciones)
  + (SELECT COUNT(*) FROM comentarios)
  + (SELECT COUNT(*) FROM reacciones)
  + (SELECT COUNT(*) FROM conversaciones)
  + (SELECT COUNT(*) FROM participantes_conversacion)
  + (SELECT COUNT(*) FROM mensajes)
  + (SELECT COUNT(*) FROM eventos)
  + (SELECT COUNT(*) FROM participantes_evento)
  + (SELECT COUNT(*) FROM seguidores)
  + (SELECT COUNT(*) FROM notificaciones)
  + (SELECT COUNT(*) FROM reportes)
  + (SELECT COUNT(*) FROM tokens_recuperacion)
  + (SELECT COUNT(*) FROM tokens_revocados)
  + (SELECT COUNT(*) FROM auditoria_roles) AS total_registros;

-- 02. Usuarios: 15 totales, 15 correos unicos, 15 hashes BCrypt, 0 en claro
-- Nota: el patron confirma FORMATO BCrypt; no comprueba por si solo que
-- el hash corresponda a una contrasena especifica.
SELECT
    COUNT(*) AS total_usuarios,
    COUNT(DISTINCT correo) AS correos_unicos,
    COALESCE(SUM(contrasena REGEXP '^\\$2[aby]\\$[0-9]{2}\\$'), 0) AS contrasenas_bcrypt,
    COALESCE(SUM(contrasena = 'Demo1234!'), 0) AS contrasenas_texto_plano
FROM usuarios;

-- Distribucion esperada: ADMINISTRADOR 1, MODERADOR 2, USUARIO 12.
SELECT r.nombre AS rol, COUNT(*) AS cantidad
FROM usuarios u
JOIN roles r ON u.id_rol = r.id_rol
GROUP BY r.nombre
ORDER BY r.nombre;

SELECT COUNT(*) AS usuarios_sin_rol
FROM usuarios u
LEFT JOIN roles r ON u.id_rol = r.id_rol
WHERE r.id_rol IS NULL;

-- 03. Publicaciones, comentarios y reacciones: 5 verificaciones; 0 errores.
SELECT 'Publicaciones sin usuario' AS validacion, COUNT(*) AS errores
FROM publicaciones p
LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Comentarios sin publicacion', COUNT(*)
FROM comentarios c
LEFT JOIN publicaciones p ON c.id_publicacion = p.id_publicacion
WHERE p.id_publicacion IS NULL
UNION ALL
SELECT 'Comentarios sin usuario', COUNT(*)
FROM comentarios c
LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Reacciones sin publicacion', COUNT(*)
FROM reacciones r
LEFT JOIN publicaciones p ON r.id_publicacion = p.id_publicacion
WHERE p.id_publicacion IS NULL
UNION ALL
SELECT 'Reacciones sin usuario', COUNT(*)
FROM reacciones r
LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
WHERE u.id_usuario IS NULL;

-- 04. Conversaciones y mensajes: 6 verificaciones; 0 errores.
SELECT 'Participantes sin conversacion' AS validacion, COUNT(*) AS errores
FROM participantes_conversacion pc
LEFT JOIN conversaciones c ON pc.id_conversacion = c.id_conversacion
WHERE c.id_conversacion IS NULL
UNION ALL
SELECT 'Participantes sin usuario', COUNT(*)
FROM participantes_conversacion pc
LEFT JOIN usuarios u ON pc.id_usuario = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Mensajes sin conversacion', COUNT(*)
FROM mensajes m
LEFT JOIN conversaciones c ON m.id_conversacion = c.id_conversacion
WHERE c.id_conversacion IS NULL
UNION ALL
SELECT 'Mensajes sin remitente valido', COUNT(*)
FROM mensajes m
LEFT JOIN usuarios u ON m.id_remitente = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Mensajes de usuarios no participantes', COUNT(*)
FROM mensajes m
LEFT JOIN participantes_conversacion pc
    ON m.id_conversacion = pc.id_conversacion
   AND m.id_remitente = pc.id_usuario
WHERE pc.id_usuario IS NULL
UNION ALL
SELECT 'Conversaciones sin dos participantes', COUNT(*)
FROM (
    SELECT c.id_conversacion
    FROM conversaciones c
    LEFT JOIN participantes_conversacion pc
        ON c.id_conversacion = pc.id_conversacion
    GROUP BY c.id_conversacion
    HAVING COUNT(pc.id_usuario) <> 2
) AS conversaciones_invalidas;

-- 05. Eventos y participaciones: 7 verificaciones; 0 errores.
SELECT 'Eventos sin proponente valido' AS validacion, COUNT(*) AS errores
FROM eventos e
LEFT JOIN usuarios u ON e.id_proponente = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Eventos con moderador inexistente', COUNT(*)
FROM eventos e
LEFT JOIN usuarios u ON e.id_moderador = u.id_usuario
WHERE e.id_moderador IS NOT NULL AND u.id_usuario IS NULL
UNION ALL
SELECT 'Participaciones sin evento', COUNT(*)
FROM participantes_evento pe
LEFT JOIN eventos e ON pe.id_evento = e.id_evento
WHERE e.id_evento IS NULL
UNION ALL
SELECT 'Participaciones sin usuario', COUNT(*)
FROM participantes_evento pe
LEFT JOIN usuarios u ON pe.id_usuario = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Eventos con fechas incorrectas', COUNT(*)
FROM eventos
WHERE fecha_fin < fecha_inicio
UNION ALL
SELECT 'Eventos con cupo no positivo', COUNT(*)
FROM eventos
WHERE cupo_maximo <= 0
UNION ALL
SELECT 'Cancelaciones con fechas incorrectas', COUNT(*)
FROM participantes_evento
WHERE fecha_cancelacion IS NOT NULL
  AND fecha_cancelacion < fecha_inscripcion;

-- 06. Seguidores, notificaciones y reportes: 12 verificaciones; 0 errores.
SELECT 'Seguidores sin usuario seguidor' AS validacion, COUNT(*) AS errores
FROM seguidores s
LEFT JOIN usuarios u ON s.id_seguidor = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Seguidores sin usuario seguido', COUNT(*)
FROM seguidores s
LEFT JOIN usuarios u ON s.id_seguido = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Usuarios que se siguen a si mismos', COUNT(*)
FROM seguidores
WHERE id_seguidor = id_seguido
UNION ALL
SELECT 'Notificaciones sin destinatario', COUNT(*)
FROM notificaciones n
LEFT JOIN usuarios u ON n.id_destinatario = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Notificaciones con actor inexistente', COUNT(*)
FROM notificaciones n
LEFT JOIN usuarios u ON n.id_actor = u.id_usuario
WHERE n.id_actor IS NOT NULL AND u.id_usuario IS NULL
UNION ALL
SELECT 'Notificaciones con publicacion inexistente', COUNT(*)
FROM notificaciones n
LEFT JOIN publicaciones p ON n.id_publicacion = p.id_publicacion
WHERE n.id_publicacion IS NOT NULL AND p.id_publicacion IS NULL
UNION ALL
SELECT 'Notificaciones con evento inexistente', COUNT(*)
FROM notificaciones n
LEFT JOIN eventos e ON n.id_evento = e.id_evento
WHERE n.id_evento IS NOT NULL AND e.id_evento IS NULL
UNION ALL
SELECT 'Notificaciones con mensaje inexistente', COUNT(*)
FROM notificaciones n
LEFT JOIN mensajes m ON n.id_mensaje = m.id_mensaje
WHERE n.id_mensaje IS NOT NULL AND m.id_mensaje IS NULL
UNION ALL
SELECT 'Notificaciones con reporte inexistente', COUNT(*)
FROM notificaciones n
LEFT JOIN reportes r ON n.id_reporte = r.id_reporte
WHERE n.id_reporte IS NOT NULL AND r.id_reporte IS NULL
UNION ALL
SELECT 'Reportes sin reportante', COUNT(*)
FROM reportes r
LEFT JOIN usuarios u ON r.id_reportante = u.id_usuario
WHERE u.id_usuario IS NULL
UNION ALL
SELECT 'Reportes sin publicacion', COUNT(*)
FROM reportes r
LEFT JOIN publicaciones p ON r.id_publicacion = p.id_publicacion
WHERE p.id_publicacion IS NULL
UNION ALL
SELECT 'Reportes con moderador inexistente', COUNT(*)
FROM reportes r
LEFT JOIN usuarios u ON r.id_moderador = u.id_usuario
WHERE r.id_moderador IS NOT NULL AND u.id_usuario IS NULL;

-- Resultado observado en DBeaver durante la actividad 039:
-- 288 registros, 15 usuarios con formato BCrypt, 0 usuarios sin rol,
-- y 30 de 30 comprobaciones de integridad sin errores.
-- Estas cifras son evidencia de aquella ejecucion, no valores garantizados
-- si la base de datos cambia posteriormente.
