-- ============================================================================
-- INSECTOPIA | Actividad 039: Validacion de integridad de la base de datos
-- Motor: MySQL 8.4 | Herramienta: DBeaver
-- Objetivo: verificar cantidades, roles, seguridad, integridad referencial
--           y reglas de negocio de participaciones en eventos.
--
-- SCRIPT 100% DE SOLO LECTURA: unicamente consultas SELECT; no modifica
-- ningun dato ni la estructura del esquema.
--
-- IMPORTANTE: este script NO ejecuta "USE". Antes de ejecutarlo, selecciona
-- explÃ­citamente en DBeaver la conexion/esquema que se desea validar.
-- Todas las consultas usan nombres de tabla sin calificar, por lo que se
-- resuelven contra el esquema activo de la conexion. La primera consulta
-- muestra ese esquema para evitar validar accidentalmente la base original.
--
-- Base de referencia: 288 registros de aplicacion + 3 roles incluidos.
-- ============================================================================

-- 00. Esquema activo (comprobar ANTES de interpretar los resultados).
SELECT
    DATABASE() AS esquema_activo,
    CASE
        WHEN DATABASE() IS NULL
            THEN 'SIN ESQUEMA ACTIVO: selecciona la base de destino en DBeaver'
        ELSE CONCAT('Validando el esquema: ', DATABASE())
    END AS estado_validacion;

-- 01. Conteo de registros por tabla (288 en total; tres tablas vacias).
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

-- 01b. Diferencias entre conteos esperados y conteos reales.
-- Una base nueva, creada con Flyway V1-V10 y cargada con el perfil demo,
-- debe devolver diferencia = 0 en las 16 filas.
WITH esperadas AS (
    SELECT 'roles' AS tabla, 3 AS esperado
    UNION ALL SELECT 'usuarios', 15
    UNION ALL SELECT 'publicaciones', 15
    UNION ALL SELECT 'comentarios', 30
    UNION ALL SELECT 'reacciones', 30
    UNION ALL SELECT 'conversaciones', 15
    UNION ALL SELECT 'participantes_conversacion', 30
    UNION ALL SELECT 'mensajes', 50
    UNION ALL SELECT 'eventos', 15
    UNION ALL SELECT 'participantes_evento', 30
    UNION ALL SELECT 'seguidores', 20
    UNION ALL SELECT 'notificaciones', 20
    UNION ALL SELECT 'reportes', 15
    UNION ALL SELECT 'tokens_recuperacion', 0
    UNION ALL SELECT 'tokens_revocados', 0
    UNION ALL SELECT 'auditoria_roles', 0
), actuales AS (
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
    UNION ALL SELECT 'auditoria_roles', COUNT(*) FROM auditoria_roles
)
SELECT
    esperadas.tabla,
    esperadas.esperado,
    actuales.registros AS actual,
    actuales.registros - esperadas.esperado AS diferencia
FROM esperadas
JOIN actuales ON actuales.tabla = esperadas.tabla
ORDER BY esperadas.tabla;

-- 01c. Diferencia global: debe ser 0.
WITH esperadas AS (
    SELECT 'roles' AS tabla, 3 AS esperado
    UNION ALL SELECT 'usuarios', 15
    UNION ALL SELECT 'publicaciones', 15
    UNION ALL SELECT 'comentarios', 30
    UNION ALL SELECT 'reacciones', 30
    UNION ALL SELECT 'conversaciones', 15
    UNION ALL SELECT 'participantes_conversacion', 30
    UNION ALL SELECT 'mensajes', 50
    UNION ALL SELECT 'eventos', 15
    UNION ALL SELECT 'participantes_evento', 30
    UNION ALL SELECT 'seguidores', 20
    UNION ALL SELECT 'notificaciones', 20
    UNION ALL SELECT 'reportes', 15
    UNION ALL SELECT 'tokens_recuperacion', 0
    UNION ALL SELECT 'tokens_revocados', 0
    UNION ALL SELECT 'auditoria_roles', 0
), actuales AS (
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
    UNION ALL SELECT 'auditoria_roles', COUNT(*) FROM auditoria_roles
)
SELECT
    SUM(esperadas.esperado) AS esperado_total,
    SUM(actuales.registros) AS actual_total,
    SUM(actuales.registros - esperadas.esperado) AS diferencia_total
FROM esperadas
JOIN actuales ON actuales.tabla = esperadas.tabla;

-- 01d. Tablas que deben quedar vacias en la carga demo inicial.
SELECT 'tokens_recuperacion' AS tabla, COUNT(*) AS registros FROM tokens_recuperacion
UNION ALL SELECT 'tokens_revocados', COUNT(*) FROM tokens_revocados
UNION ALL SELECT 'auditoria_roles', COUNT(*) FROM auditoria_roles;

-- 02. Usuarios: 15 totales, 15 identificadores y correos unicos,
-- 15 hashes BCrypt, 0 en claro. Los nuevos campos obligatorios no son nulos.
-- Nota: el patron confirma FORMATO BCrypt; no comprueba por si solo que
-- el hash corresponda a una contrasena especifica.
SELECT
    COUNT(*) AS total_usuarios,
    COUNT(DISTINCT nombre_usuario) AS nombres_usuario_unicos,
    COUNT(DISTINCT correo) AS correos_unicos,
    COALESCE(SUM(nombre_usuario IS NULL OR fecha_nacimiento IS NULL
        OR pais_codigo IS NULL OR estado_region IS NULL), 0) AS campos_obligatorios_faltantes,
    COALESCE(SUM(BINARY nombre_usuario <> BINARY LOWER(nombre_usuario)
        OR nombre_usuario NOT REGEXP '^[a-z0-9._]{3,30}$'), 0) AS nombres_usuario_invalidos,
    COALESCE(SUM(fecha_nacimiento > CURRENT_DATE()), 0) AS nacimientos_futuros,
    COALESCE(SUM(contrasena REGEXP '^\\$2[aby]\\$[0-9]{2}\\$'), 0) AS contrasenas_bcrypt,
    COALESCE(SUM(contrasena = 'Demo1234!'), 0) AS contrasenas_texto_plano
FROM usuarios;

-- La estructura de usuarios debe contener los campos nuevos y solo foto_perfil.
-- genero y foto_perfil pueden ser nulos. La columna estado de la cuenta sigue vigente.
SELECT column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'usuarios'
ORDER BY ordinal_position;

SELECT index_name, column_name, non_unique
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'usuarios'
  AND index_name IN ('uk_usuarios_nombre_usuario', 'uk_usuarios_correo')
ORDER BY index_name;

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
-- Se conservan las dos comprobaciones originales: conversaciones con un
-- numero de participantes distinto de dos y mensajes cuyo remitente no
-- pertenece a la conversacion.
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

-- 05. Eventos y participaciones: 12 verificaciones; 0 errores.
-- Las siete primeras son las comprobaciones originales; se anaden cinco
-- reglas de negocio sobre estados, cupos, duplicados y cancelaciones.
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
  AND fecha_cancelacion < fecha_inscripcion
UNION ALL
SELECT 'Participaciones en eventos no aprobados', COUNT(*)
FROM participantes_evento pe
JOIN eventos e ON pe.id_evento = e.id_evento
WHERE e.estado <> 'APROBADO'
UNION ALL
SELECT 'Eventos con sobrecupo de INSCRITOS', COUNT(*)
FROM (
    SELECT e.id_evento
    FROM eventos e
    LEFT JOIN participantes_evento pe
        ON pe.id_evento = e.id_evento
       AND pe.estado = 'INSCRITO'
    GROUP BY e.id_evento, e.cupo_maximo
    HAVING COUNT(pe.id_usuario) > e.cupo_maximo
) AS eventos_sobrecupados
UNION ALL
SELECT 'Participaciones duplicadas (evento, usuario)', COUNT(*)
FROM (
    SELECT id_evento, id_usuario
    FROM participantes_evento
    GROUP BY id_evento, id_usuario
    HAVING COUNT(*) > 1
) AS participaciones_duplicadas
UNION ALL
SELECT 'Participaciones CANCELADAS sin fecha de cancelacion', COUNT(*)
FROM participantes_evento
WHERE estado = 'CANCELADO'
  AND fecha_cancelacion IS NULL
UNION ALL
SELECT 'Participaciones con cancelacion anterior a la inscripcion', COUNT(*)
FROM participantes_evento
WHERE estado = 'CANCELADO'
  AND fecha_cancelacion IS NOT NULL
  AND fecha_cancelacion < fecha_inscripcion;

-- 05b. Resumen: participaciones agrupadas por estado del evento.
-- En la carga demo corregida: APROBADO = 30, PENDIENTE = 0, RECHAZADO = 0.
SELECT
    e.estado AS estado_evento,
    COUNT(DISTINCT e.id_evento) AS eventos,
    COUNT(pe.id_usuario) AS participaciones
FROM eventos e
LEFT JOIN participantes_evento pe ON pe.id_evento = e.id_evento
GROUP BY e.estado
ORDER BY e.estado;

-- 05c. Resumen en una fila, util para comprobar la regla de la actividad 037.
SELECT
    SUM(CASE WHEN e.estado = 'APROBADO' THEN 1 ELSE 0 END)
        AS eventos_aprobados,
    SUM(CASE WHEN e.estado = 'APROBADO'
             THEN COALESCE(p.participaciones, 0) ELSE 0 END)
        AS participaciones_en_aprobados,
    SUM(CASE WHEN e.estado IN ('PENDIENTE', 'RECHAZADO', 'CANCELADO')
             THEN COALESCE(p.participaciones, 0) ELSE 0 END)
        AS participaciones_en_no_aprobados
FROM eventos e
LEFT JOIN (
    SELECT id_evento, COUNT(*) AS participaciones
    FROM participantes_evento
    GROUP BY id_evento
) p ON p.id_evento = e.id_evento;

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

-- Resultado esperado en una base nueva, creada con Flyway V1-V10 y poblada
-- con el perfil demo: 16 tablas de aplicacion, 288 registros, 3 roles,
-- 15 usuarios, 15 publicaciones, 30 comentarios, 30 reacciones,
-- 15 conversaciones, 30 participantes de conversacion, 50 mensajes,
-- 15 eventos (5 APROBADOS / 5 PENDIENTES / 5 RECHAZADOS),
-- 30 participantes de evento (todos en eventos APROBADOS),
-- 20 seguidores, 20 notificaciones, 15 reportes,
-- tokens_recuperacion / tokens_revocados / auditoria_roles vacias
-- y 0 errores en todas las comprobaciones de integridad y reglas de negocio.
-- Estas cifras son el objetivo de la validacion, no evidencia de una
-- ejecucion previa: comprueba siempre primero el esquema_activo.
