# Integración backend — Actividad 076: Gestión de seguidores

Estado: **implementado**. Compatible con el backend 074/066 y con el frontend 073/075 existente.
La integración visual de los botones sigue pendiente y deliberadamente no se habilitó ningún
control del frontend.

## Endpoints

Todos exigen `Authorization: Bearer <JWT>` y la autoridad existente `CONTENIDO_LEER`.
No se crearon permisos nuevos.

| Método | Ruta | Éxito | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/api/usuarios/me/seguidores?page=0&size=20&q=` | `200` | `PaginaDTO<UsuarioPublicoDTO>` |
| `GET` | `/api/usuarios/{id}` | `200` | `UsuarioPublicoDTO` |
| `POST` | `/api/usuarios/{id}/seguir` | `201` crea / `200` ya existía | sin cuerpo |
| `DELETE` | `/api/usuarios/{id}/seguir` | `204` | sin cuerpo |

Ejemplo de elemento del listado y de perfil público (datos de prueba, sin secretos):

```json
{
  "id": 11,
  "nombre": "Clara Ríos",
  "nombreUsuario": "clara.rios",
  "avatarUrl": null,
  "descripcion": "Observación de libélulas",
  "loSigo": true,
  "totalSeguidores": 12,
  "totalSeguidos": 4
}
```

Ejemplo de paginación vacía:

```json
{
  "content": [],
  "number": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0,
  "first": true,
  "last": true
}
```

## Cumplimiento (21 puntos)

1. **Estructura.** Nuevo `SeguidorController`, `SeguidorService` y `UsuarioPublicoDTO`;
   `SeguidorRepository` se amplió sin romper los métodos de 066. Se reutilizan `Usuario`,
   `Seguidor`, `SeguidorId` y `Notificacion`. No hay tabla, columna ni migración nueva.
2. **Identidad del seguidor.** Las cuatro operaciones toman el id exclusivamente de
   `principal.idUsuario()` (`@AuthenticationPrincipal InsectopiaUserDetails`). El `{id}` de la
   ruta identifica solamente al otro usuario.
3. **Sin suplantación.** No se declaran `@RequestBody`, `@RequestParam` ni `@RequestHeader` con
   `idUsuario`, `seguidorId` o `remitenteId`. Parámetros como `?idUsuario=999` o
   `X-Usuario-Id: 999` se ignoran; un principal nulo o sin id produce 401.
4. **Listado paginado en base de datos.** `buscarSeguidores(...)` resuelve búsqueda, filtro y
   `LIMIT/OFFSET` en MySQL con `countQuery` propia; no se pagina en memoria.
5. **Parámetros validados.** `page=0`, `size=20` y `q=""` por defecto; `@Min(0)`, `@Min(1)`,
   `@Max(50)` y `@Size(max=100)` con `@Validated`. Valores inválidos devuelven 400 con
   `ErrorResponseDTO`. El servicio recorta defensivamente `q` a 100 caracteres.
6. **Búsqueda insensible a mayúsculas.** `lower(nombre)` o `lower(nombreUsuario)` con patrón
   `%q%`, `Locale.ROOT` y escape de `\`, `%` y `_`, aplicado antes de paginar.
7. **Exclusiones y orden estable.** Se excluye al propio usuario y a cuentas con
   `estado != ACTIVO` (incluye `BLOQUEADO` y `DESACTIVADO`). Orden: `lower(nombre)`,
   `lower(nombreUsuario)`, `idUsuario`.
8. **Sin N+1 en el listado.** `join fetch s.seguidor` evita una consulta por fila; `loSigo` se
   calcula con una sola llamada a `findIdsSeguidos`; los conteos de seguidores/seguidos de toda
   la página se obtienen en dos consultas agrupadas.
9. **DTO público seguro.** `UsuarioPublicoDTO` tiene exactamente ocho campos: `id`, `nombre`,
   `nombreUsuario`, `avatarUrl`, `descripcion`, `loSigo`, `totalSeguidores`, `totalSeguidos`.
   No expone correo, contraseña, teléfono, fecha de nacimiento, género, tokens, preferencias,
   entidades JPA ni ubicación (`paisCodigo`, `estadoRegion`).
10. **Perfil público con conteos reales.** `GET /api/usuarios/{id}` usa `COUNT` sobre
    `seguidores`: `countBySeguido_IdUsuario` y `countBySeguidor_IdUsuario`. No hay columnas
    redundantes ni cifras calculadas en memoria.
11. **`POST` sin semántica mezclada.** `201` cuando se inserta la relación y `200` cuando ya
    existía. No se usa `409` para duplicados de seguimiento; el `409` global queda reservado a
    otras violaciones de unicidad del proyecto.
12. **Duplicados concurrentes.** La clave compuesta `SeguidorId(idSeguidor, idSeguido)` y la
    transacción impiden dos filas. Si otra petición gana la carrera,
    `DataIntegrityViolationException` se convierte en respuesta idempotente `200`, sin duplicado
    ni aviso adicional.
13. **Autoseguimiento.** `id == principal.idUsuario()` se rechaza con 400
    (`RegistrationValidationException`, `details[0].field = "id"`) antes de cualquier inserción.
14. **`DELETE` idempotente.** Borra únicamente `SeguidorId(principal, {id})` mediante
    `deleteById`; repetirlo o borrar una relación inexistente devuelve `204`. No afecta
    relaciones ajenas ni conversaciones/mensajes.
15. **Notificación transaccional.** `NotificacionService.porNuevoSeguidor(...)` usa
    `Propagation.MANDATORY` y se ejecuta dentro del mismo `TransactionTemplate` que
    `saveAndFlush` de la relación.Tipo: `NUEVO_SEGUIDOR`, destinatario: el seguido, actor: el
    seguidor. Si falla la notificación, se revierte el seguimiento.
16. **Sin avisos espurios.** Repetir `POST` o ejecutar `DELETE` no crea notificaciones; las
    comprobaciones y pruebas lo confirman (`verifyNoInteractions(notificaciones)`).
17. **Seguridad 401/403.** Sin JWT las cuatro rutas devuelven 401. Sin `CONTENIDO_LEER`, o si el
    servicio lanza `AccessDeniedException`, devuelven 403. No se relajó `SecurityConfig`.
18. **404 y 400 controlados.** Usuario inexistente, inactivo o bloqueado ⇒ 404; path `id`
    no positivo, paginación inválida o autoseguimiento ⇒ 400. No se exponen trazas ni mensajes
    internos.
19. **Compatibilidad.** `GET /api/usuarios/seguidos` (066), `GET /api/usuarios/me` y
    `/api/usuarios/me/publicaciones` (074) conservan ruta, DTO y contrato. `PaginaDTO` mantiene
    `content, number, size, totalElements, totalPages, first, last`; el DTO reutiliza los nombres
    `id, nombre, nombreUsuario, avatarUrl, descripcion, loSigo` que ya adapta el frontend.
20. **Alcance intacto.** No se modificaron MySQL, Flyway, `application.properties`, `.env`,
    frontend 073/075, Login, Registro, conversaciones, mensajes, eventos, moderación ni
    notificaciones ajenas (sólo se añadió el método `porNuevoSeguidor`). El archivo
    `application.properties` aparece modificado en el árbol por trabajo previo ajeno a 076;
    esta actividad no lo tocó. No se habilitaron botones del frontend.
21. **Verificación.** Pruebas nuevas: `SeguidorServiceTests` (11) y
    `SeguidorControllerMvcTests` (7) → 18/18. Contexto real `@SpringBootTest`: 1/1, Flyway
    validó 11 migraciones. Batería completa: **274 ejecutadas, 0 fallidas, 0 errores, 2
    omitidas** por diseño (`CountriesNowClientLiveTests` y `EventosMySqlIntegrationTests`).
    `mvnw package -DskipTests` y `git diff --check` correctos. No se imprimió ningún JWT,
    secreto ni credencial; no se hizo commit, push ni cambio de rama.

## Cambios en el backend

| Archivo | Cambio |
| --- | --- |
| `repository/SeguidorRepository.java` | `buscarSeguidores(...)`, dos conteos agrupados por página; se conservan todos los métodos 066. |
| `dtos/UsuarioPublicoDTO.java` | DTO público de ocho campos, compartido por listado y perfil. |
| `services/SeguidorService.java` | Listado, perfil, seguir/dejar seguir, idempotencia, carrera y transacción. |
| `services/NotificacionService.java` | Constante `NUEVO_SEGUIDOR` y `porNuevoSeguidor(...)` con `MANDATORY`. |
| `controllers/SeguidorController.java` | Cuatro endpoints 076 con `@PreAuthorize(CONTENIDO_LEER)`. |
| `services/SeguidorServiceTests.java` | Reglas de negocio y mapeo sin base de datos. |
| `controllers/SeguidorControllerMvcTests.java` | JWT, 401/403/404/400/200/201/204 y privacidad. |
| `INTEGRACION_SEGUIDORES_076.md` | Este documento. |

## Pruebas y entorno

Comandos ejecutados desde la raíz, con `backend/.env` cargado **sólo en variables de proceso**
y `DB_NAME=insectopia_modelo_nuevo` únicamente para validar el contexto:

```powershell
.\backend\mvnw.cmd -f backend\pom.xml -Dtest=SeguidorServiceTests,SeguidorControllerMvcTests test
.\backend\mvnw.cmd -f backend\pom.xml -Dtest=InsectopiaApplicationTests test
.\backend\mvnw.cmd -f backend\pom.xml test
.\backend\mvnw.cmd -f backend\pom.xml package -DskipTests
git diff --check
```

No existe una base aislada `insectopia_test` autorizada. No se añadieron pruebas escribientes:
las integraciones existentes son `@Transactional` y se revierten; no se crearon registros
permanentes desde 076. `TEMP`, `TMP` y `java.io.tmpdir` se redirigieron a `backend/target/tmp`
(ignorado por Git) para evitar el problema de espacio en `C:`. No se realizó verificación HTTP
manual por no disponer de una sesión real; el contrato se comprobó con MockMvc y JWT de prueba
generado en memoria.

## Pendiente

- Frontend 075: sustituir `CONTRATOS_PENDIENTES` por las cuatro llamadas reales, conectar los
  botones de seguir/dejar de seguir y recargar el listado/perfil tras la confirmación del
  servidor. Queda fuera de esta actividad; los botones siguen deshabilitados.
- No se ha solicitado ni creado documentación Bruno para 076.
