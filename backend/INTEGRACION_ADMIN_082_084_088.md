# Administración integral (082 / 084 / 088)

El único módulo REST administrativo es `/api/admin`. Requiere `Authorization: Bearer <JWT>` de un `ADMINISTRADOR` activo, versión de token vigente, autoridad HTTP `MODULO_ADMINISTRAR` y la autoridad de método indicada abajo. No se lee el administrador del cuerpo de la solicitud. Para integrar el panel 081, **reiniciar el backend** con este código; la versión anterior no tiene estas rutas.

| Método | Ruta | Autoridad de método | Contrato |
|---|---|---|---|
| GET | `/api/admin/usuarios` | `USUARIO_GESTIONAR` | `PaginaDTO<AdminUsuarioResponseDTO>`; `q`, `rol`, `estado`, `page=0`, `size=10`, `ordenar=fechaRegistro`, `direccion=desc` |
| GET | `/api/admin/usuarios/resumen` | `USUARIO_GESTIONAR` | `AdminResumenDTO` (global, independiente de filtros/página) |
| GET | `/api/admin/usuarios/{id}` | `USUARIO_GESTIONAR` | `AdminUsuarioResponseDTO` |
| POST | `/api/admin/usuarios` | `USUARIO_GESTIONAR` | `RegisterRequestDTO` -> 201 + `Location` + `AdminUsuarioResponseDTO` (rol inicial `USUARIO`) |
| PUT | `/api/admin/usuarios/{id}` | `USUARIO_GESTIONAR` | `AdminEditarUsuarioRequestDTO` -> `AdminUsuarioResponseDTO` |
| DELETE | `/api/admin/usuarios/{id}` | `USUARIO_GESTIONAR` | Eliminación física irreversible -> 204 sin cuerpo |
| PATCH | `/api/admin/usuarios/{id}/estado` | `USUARIO_GESTIONAR` | `AdminEstadoRequestDTO` -> `AdminUsuarioResponseDTO` |
| GET | `/api/admin/roles` | `ROL_ASIGNAR` | Lista `AdminRolDTO` (`nombre`, `descripcion`) |
| PATCH | `/api/admin/usuarios/{id}/rol` | `ROL_ASIGNAR` | `AdminRolRequestDTO` -> `AdminUsuarioResponseDTO` |
| GET | `/api/admin/usuarios/{id}/auditoria-roles` | `ROL_ASIGNAR` | `PaginaDTO<AdminAuditoriaRolDTO>`; `page=0`, `size=10` |

`PaginaDTO`: `content`, `number`, `size`, `totalElements`, `totalPages`, `first`, `last`. `page` empieza en 0; `size` 1–50. Búsqueda `q` (hasta 100 caracteres, nombre/nombreUsuario/correo, sin distinguir mayúsculas), filtros `rol` (`USUARIO`, `MODERADOR`, `ADMINISTRADOR`) y `estado` (`ACTIVO`, `BLOQUEADO`, `DESACTIVADO`). Se combinan con AND. `ordenar`: sólo `fechaRegistro`, `nombre` o `idUsuario`; `direccion`: `asc`/`desc`. Siempre se desempata por `idUsuario`. `q` no permite que `%` o `_` funcionen como comodines SQL.

`AdminUsuarioResponseDTO`: `idUsuario`, `nombre`, `nombreUsuario`, `correo`, `rol`, `estado`, `paisCodigo`, `estadoRegion`, `fotoPerfil`, `fechaNacimiento`, `genero`, `telefono`, `recibirSms`, `recibirWhatsapp`, `fechaRegistro`, `fechaActualizacion`, `protegida`, `cuentaPropia`. `estado` **no** es la región geográfica (`estadoRegion`). Nunca contiene contraseña, hash, JWT ni `versionToken`; fechas automáticas y permisos no son editables. `protegida` indica la cuenta de evaluación; `cuentaPropia` identifica la sesión actual. Estas marcas son informativas: el backend siempre repite la autorización y verificación transaccional.

`AdminResumenDTO`: `totalUsuarios`, `usuarios` (rol USUARIO), `moderadores`, `administradores`, `cuentasDesactivadas`. `AdminAuditoriaRolDTO`: `idAuditoria`, `idAdministrador` (null si fue eliminado), `nombreAdministrador` (`Cuenta eliminada` si procede), `rolAnterior`, `rolNuevo`, `fechaCambio`. Los permisos se heredan del rol mediante `Permissions`, no existe edición individual.

## Ejemplos de integración (datos ilustrativos, no cargados en MySQL)

```http
GET /api/admin/usuarios?q=ana&rol=USUARIO&estado=ACTIVO&page=0&size=10&ordenar=nombre&direccion=asc
Authorization: Bearer <JWT_ADMIN>
```

```json
{"content":[{"idUsuario":42,"nombre":"Ana Ejemplo","nombreUsuario":"ana_ejemplo","correo":"ana@example.invalid","rol":"USUARIO","estado":"ACTIVO","paisCodigo":"MX","estadoRegion":"Oaxaca","fotoPerfil":null,"fechaNacimiento":"1990-01-01","genero":null,"telefono":null,"recibirSms":false,"recibirWhatsapp":false,"fechaRegistro":"2026-01-01T10:00:00","fechaActualizacion":"2026-01-01T10:00:00","protegida":false,"cuentaPropia":false}],"number":0,"size":10,"totalElements":1,"totalPages":1,"first":true,"last":true}
```

```http
PATCH /api/admin/usuarios/42/rol
Authorization: Bearer <JWT_ADMIN>
Content-Type: application/json

{"rol":"MODERADOR"}
```

```http
PATCH /api/admin/usuarios/42/estado
Authorization: Bearer <JWT_ADMIN>
Content-Type: application/json

{"estado":"DESACTIVADO"}
```

Ambos PATCH responden con el `AdminUsuarioResponseDTO` actualizado. Para alta se usa el mismo JSON de `/api/auth/register` (sin `rol` ni `estado`). `PUT` requiere todos los campos editables del registro excepto `contrasena`: si se omite/null conserva el hash, si se envía valida la misma política y se codifica con BCrypt. `fechaRegistro`/`fechaActualizacion` son sólo lectura; tampoco se acepta editar foto, rol o estado por `PUT`. Para desactivar o reactivar enviar `{"estado":"DESACTIVADO"}` o `{"estado":"ACTIVO"}`. Volver a solicitar resumen, página, ficha y auditoría tras un cambio confirmado.

## Seguridad y concurrencia

- Se prohíbe administrar la propia cuenta desde este módulo. La identidad de la administradora de evaluación sale de `ProtectedAccounts.EVALUATION_ADMIN_USERNAME`, **compartida con el seeder `demo`**: no depende de IDs, correos arbitrarios ni credenciales. Se prohíbe modificarla (no se prohíbe consultarla). No se introduce ninguna cuenta nueva de evaluación.
- Estado/rol/eliminación bloquean siempre la fila del rol `ADMINISTRADOR` antes de la cuenta afectada (`PESSIMISTIC_WRITE`). Si el objetivo es administrador activo se cuentan los activos bajo ese candado antes de reducir el total; la última cuenta activa no puede perder el rol, desactivarse ni eliminarse incluso ante solicitudes concurrentes. La propia cuenta tampoco puede gestionarse por esta API. Un PATCH hacia `BLOQUEADO` devuelve 422; sólo se conserva como estado histórico consultable y reactivable.
- El cambio efectivo de rol actualiza `usuarios.id_rol`, aumenta `version_token` e inserta `auditoria_roles` con el administrador autenticado, los dos roles y la fecha dentro **de una sola transacción**. No se audita un PATCH sin cambio. Estado, nueva contraseña o correo actualizado invalidan JWT anteriores incrementando `version_token`; estados no activos son rechazados por `CustomUserDetailsService`. `JwtAuthenticationFilter` verifica la versión existente en cada petición.
- Alta reutiliza `AuthService.register` (catálogo, unicidad, normalización y BCrypt) y crea sólo un usuario normal; promoción posterior exige su endpoint auditado. Edición utiliza las mismas restricciones de datos y `CatalogoUbicacionesService.validarRegion`. `AuthService.uniqueConflict` convierte los errores concurrentes MySQL 1062 de correo/nombre de usuario en 409 con campo. Datos inválidos 400, token ausente/antiguo 401, rol insuficiente 403, entidad inexistente 404, duplicados 409, reglas de protección 422, errores internos 500 sin detalles al cliente. No se modifica el manejo global de `IllegalArgumentException`.
- Las acciones confirmadas se registran en el log **después del commit**; la eliminación sólo registra la operación y el ID del administrador, sin el ID del usuario eliminado, correos, hashes ni JWT. Los logs de otras operaciones administrativas pueden incluir el ID del objetivo; no se modifican los logs históricos. La única auditoría persistente disponible es `auditoria_roles`; el esquema no ofrece tabla de auditoría general. V1–V11 no se alteraron; se añadió V12.

## Limitaciones deliberadas

`DELETE /api/admin/usuarios/{id}` borra definitivamente la cuenta, su contenido propio (publicaciones, comentarios, reacciones, mensajes, seguimientos, participación, notificaciones y tokens) y las imágenes locales de publicaciones. Eventos propios con participantes e historial se conservan anonimizados, sin imagen local. Los comentarios y reacciones de terceros de publicaciones eliminadas se conservan desligados (`id_publicacion=NULL`) y ya no aparecen en el feed. Reportes y auditorías se conservan sin FK hacia la cuenta borrada ni nombre/correo/hash; descripción/resolución potencialmente personal de reportes afectados se descarta. Los mensajes de terceros siguen en sus conversaciones, que usan una clave archivada sin el ID eliminado y muestran «Cuenta eliminada» como interlocutor; no se puede enviar más a esa conversación. La eliminación exige confirmación irreversible en el frontend; la autorización y protección están siempre en backend.

Flyway **V12** sólo altera las FK imprescindibles de `auditoria_roles`, `reportes`, `eventos`, `comentarios` y `reacciones` para permitir referencias NULL mediante `ON DELETE SET NULL`. No se modificaron V1–V11. La cola `limpieza_archivos_pendientes` registra en la misma transacción los nombres locales seguros de imágenes de publicaciones/eventos; un trabajador programado borra los archivos después del commit y reintenta tras fallos o reinicios. Las rutas arbitrarias en `usuarios.foto_perfil` no se borran porque no existe un almacenamiento gestionado por el proyecto para ellas. **Límite de anonimización:** los textos redactados por terceros (por ejemplo, comentarios, mensajes y reportes cuyo autor permanece) pueden mencionar el nombre o alias antiguo; no se inspeccionan ni reescriben automáticamente porque se destruirían aportes ajenos. Las fechas, conteos y motivos no identificatorios de los registros históricos permanecen. No hay edición de foto/portada ni editor de permisos.

Desactivar (`PATCH .../estado` con `DESACTIVADO`) **no borra** ninguna fila: revoca JWT previos, deniega login y oculta publicaciones, comentarios y eventos propios en consultas públicas y accesos directos. Reactivar (`ACTIVO`) recupera el acceso y la visibilidad de contenido que siga moderado como visible/aprobado; no cambia el estado de moderación.

Las pruebas de integración requieren `DB_NAME=insectopia_test` y credenciales de esa base, crean sólo registros temporales y los borran después. Nunca activar `DB_NAME=insectopia_dev_v2` para estas pruebas. Verifican MySQL real, BCrypt, filtros, auditoría, rollback, versión y dos solicitudes concurrentes contra los últimos dos administradores; la prueba de carrera exige que la base de test no contenga otros administradores activos.

Verificación (22/11/2026): `./mvnw.cmd test` con `DB_NAME=insectopia_test`: **275 pruebas, 0 fallos, 0 errores, 1 omitida**. `AdminEliminacionMySqlTests` verifica V12, FK, borrado real, rollback, conservación de terceros y visibilidad reversible. Verificación posterior: 0 usuarios temporales, 0 tareas de limpieza y 0 referencias históricas desligadas procedentes de estas pruebas; V12 aplicada. Las pruebas nunca se ejecutan sobre `insectopia_dev_v2` ni datos reales.
