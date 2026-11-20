# Plan de migraciones — Insectopia

## Objetivo

Establecer la estructura, nomenclatura y orden de ejecución de las migraciones de la base de datos MySQL de Insectopia utilizando Flyway.

La base de datos tendrá **16 tablas de aplicación**, organizadas en **10 migraciones versionadas**.

## Ubicación

Los scripts SQL se almacenarán en:

`backend/src/main/resources/db/migration/`

Esta ruta corresponde a la configuración de Spring Boot:

`spring.flyway.locations=classpath:db/migration`

## Migraciones acordadas

| Versión | Archivo | Tablas o función |
|---|---|---|
| V1 | `V1__crear_roles_usuarios.sql` | Crear `roles` y `usuarios` |
| V2 | `V2__crear_seguidores.sql` | Crear `seguidores` |
| V3 | `V3__crear_publicaciones.sql` | Crear `publicaciones`, `comentarios` y `reacciones` |
| V4 | `V4__crear_mensajes.sql` | Crear `conversaciones`, `participantes_conversacion` y `mensajes` |
| V5 | `V5__crear_notificaciones.sql` | Crear `notificaciones` |
| V6 | `V6__crear_eventos.sql` | Crear `eventos` y `participantes_evento`; completar la relación de notificaciones con eventos |
| V7 | `V7__crear_reportes.sql` | Crear `reportes`; completar la relación de notificaciones con reportes |
| V8 | `V8__crear_tokens_seguridad.sql` | Crear `tokens_recuperacion` y `tokens_revocados` |
| V9 | `V9__insertar_roles.sql` | Insertar los roles ADMINISTRADOR, MODERADOR y USUARIO |
| V10 | `V10__crear_auditoria_roles.sql` | Crear `auditoria_roles` |

## Reglas de desarrollo

1. Utilizar nombres únicos y consecutivos para las versiones.
2. Separar el número de versión y la descripción mediante dos guiones bajos (`__`).
3. Crear cada archivo SQL únicamente cuando se desarrolle su actividad correspondiente.
4. No modificar migraciones que ya hayan sido ejecutadas en una base de datos compartida. La revisión excepcional de V1 para el modelo definitivo de usuarios requiere reconstruir los entornos de desarrollo sobre una base nueva y vacía; su checksum cambia. Para bases compartidas, desplegadas o con datos a conservar, usar una migración incremental compatible en ese entorno, sin reparar el historial anterior.
5. Para cambios futuros posteriores a V10, crear nuevas migraciones a partir de V11; la revisión de V1 no introduce V11.
6. Ejecutar las migraciones automáticamente mediante Spring Boot y Flyway.
7. Utilizar DBeaver para consultar, verificar y visualizar las tablas, sin crearlas manualmente.
8. Mantener las migraciones en GitHub mediante ramas y Pull Requests.
9. No utilizar `flyway clean` para solucionar errores de migración.
10. Conservar las llaves primarias, foráneas y restricciones del diccionario de datos aprobado.

## Verificación

Una vez implementadas las diez migraciones:

- Confirmar que Flyway las haya aplicado correctamente.
- Verificar las 16 tablas de aplicación en MySQL.
- Revisar `flyway_schema_history` desde DBeaver.
- Exportar un nuevo diagrama desde el esquema reconstruido; `database/ER/insectopia.png` es una imagen histórica sin fuente editable y todavía no refleja los nuevos campos de usuario ni la eliminación de la foto de portada.
- Generar un respaldo nuevo con otro nombre solo desde un esquema reconstruido y validado; no sobrescribir `database/insectopia_backup.sql` (histórico).

**Nota:** La tabla `flyway_schema_history` es administrada por Flyway y no forma parte de las 16 tablas de aplicación.
