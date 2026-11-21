-- Desempate de mensajes con la misma fecha (DATETIME sin fracciones).
-- NULL conserva la semántica histórica de fecha_ultima_lectura.
ALTER TABLE participantes_conversacion
    ADD COLUMN id_ultimo_mensaje_leido BIGINT NULL;
