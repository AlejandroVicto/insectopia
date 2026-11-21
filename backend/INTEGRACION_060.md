# Actividad 060 — Backend Inicio

Implementación por capas para el feed de `frontend/src/pages/Inicio.jsx` sin modificar `frontend/`, migraciones ni datos.

## Endpoints

| Método | Ruta | Parámetros / cuerpo | Éxito |
| --- | --- | --- | --- |
| `GET` | `/api/publicaciones` | `page>=0`, `1<=size<=50`, `feed=para-ti|global` (defecto `para-ti`), `q` opcional (≤100) | `200` página |
| `GET` | `/api/publicaciones/{id}` | — | `200` publicación |
| `POST` | `/api/publicaciones` | `{ "contenido": "...", "imagen": "..." }` | `201` + `Location` |
| `GET` | `/api/publicaciones/{id}/comentarios` | `page`, `size` | `200` página |
| `POST` | `/api/publicaciones/{id}/comentarios` | `{ "contenido": "..." }` | `201` + `Location` |
| `GET` | `/api/publicaciones/{id}/reaccion` | — | `200` estado |
| `POST` | `/api/publicaciones/{id}/reaccion` | — | `200` estado; `409` si ya reaccionó |
| `DELETE` | `/api/publicaciones/{id}/reaccion` | — | `200` estado; `404` si no había reacción |

Todos requieren Bearer JWT y la autoridad `CONTENIDO_LEER`, que `Permissions` concede a USUARIO, MODERADOR y ADMINISTRADOR.

## Contrato de paginación y DTO

Respuesta de lista (idéntica para comentarios, cambiando el tipo de `content`):

```json
{
  "content": [{
    "id": 24,
    "autor": { "id": 7, "nombre": "María", "nombreUsuario": "maria", "avatarUrl": null },
    "contenido": "Avistamiento en el jardín",
    "imagenUrl": null,
    "fechaPublicacion": "2026-11-20T08:00:00",
    "estado": "VISIBLE",
    "totalComentarios": 2,
    "totalReacciones": 5,
    "reaccionUsuario": "ME_GUSTA"
  }],
  "number": 0, "size": 10, "totalElements": 1, "totalPages": 1,
  "first": true, "last": true
}
```

`PaginaDTO` genera estos metadatos de forma estable; no se serializa `PageImpl` directamente. `PublicacionResponseDTO` y `ComentarioResponseDTO` son records: no exponen entidades JPA, contraseñas, correos, tokens ni colecciones internas.

### Discrepancia documentada con 059

- `INTEGRACION_INICIO.md` mostraba `"titulo": null`. **El DTO no incluye `titulo`** porque la entidad y la migración V3 no tienen esa columna. `publicacionesAdapter.js` trata el campo como opcional (`optionalText(raw.titulo)` → `null`), así que el feed sigue siendo compatible sin inventar datos ni añadir columnas.
- `fechaPublicacion` se envía como `LocalDateTime` ISO local (`yyyy-MM-ddTHH:mm:ss`, sin offset), tal como sugería el documento 059. Si se requiere UTC explícito, hay que acordarlo y adaptar el DTO y el adaptador.
- `reaccionUsuario` es el `tipo` real de la tabla (`ME_GUSTA`) o `null`; los totales son conteos confirmados en MySQL, no optimistas.
- `imagenUrl` es el contenido de la columna `imagen` (cadena de hasta 500 caracteres, URL o identificador ya resuelto). No existe endpoint de carga de archivos en esta actividad.

## Reglas de negocio y seguridad

- Paginación con `Pageable` y `findAll(Specification, pageable)` en MySQL; orden estable `fechaPublicacion DESC, idPublicacion DESC`. Nunca se carga la tabla completa para paginar en memoria.
- `q` filtra `contenido` con `LIKE` case-insensitive, escapando `%`, `_` y `\`.
- `feed=para-ti` = publicaciones `VISIBLE` del usuario autenticado y de los usuarios que sigue (subconsulta sobre `seguidores`, sin algoritmo nuevo). `feed=global` = todas las `VISIBLE`.
- `GET /{id}` permite `VISIBLE` a cualquier usuario autenticado; `OCULTA`/`ELIMINADA` solo al autor o a MODERADOR/ADMINISTRADOR. Igual criterio aplica a comentarios y reacciones.
- El autor de publicaciones y comentarios y el usuario de la reacción se obtienen de `InsectopiaUserDetails` (reconstruido desde la BD por el filtro JWT), nunca del cuerpo de la petición.
- Reacciones: unicidad `(id_publicacion, id_usuario)` de V3; duplicado → `409` con `details[{field:"publicacionId"}]`; carreras concurrentes se convierten en `409` al capturar `DataIntegrityViolationException`.
- Errores: `GlobalExceptionHandler` existente → `{timestamp,status,error,message,path,details}`; validaciones de parámetros y cuerpo dan `400`, recurso ausente `404`, acceso denegado `403`, sin token `401`.

## Pruebas

- `PublicacionesServiceTests` (13) y `PublicacionesMvcTests` (10) se ejecutan sin MySQL (Mockito + `@WebMvcTest` + JWT real firmado en el test): **23/23 pasaron**. Cubren paginación, filtros, búsqueda, consulta autorizada, creación válida/inválida, sin token, 403 por propiedad/permisos, 404, comentarios, reacciones duplicadas y DTO sin datos sensibles.
- La suite completa `.\mvnw.cmd test` terminó con `EXIT=1`: **148 tests, 0 failures, 9 errors, 1 skipped**. Los 9 errores son de clases `@SpringBootTest` preexistentes por `Communications link failure` a MySQL: `InsectopiaApplicationTests` (1), `RepositoriosIntegrationTests` (5) y `UsuarioModeloIntegrationTests` (3). `DatabaseSeederTests` (11) y el resto de pruebas unitarias/MVC pasaron. No hay fallos nuevos atribuibles a esta actividad; en esta sesión `localhost:3306` no responde y esas integraciones quedan pendientes de ejecutar con MySQL disponible.
- No había colección Bruno en el repositorio. Se añadió una colección mínima en `bruno/` con `{{baseUrl}}` y `{{token}}`; **no se ejecutó** contra el backend.

## Dependencias

- Para 059: arrancar el backend con MySQL y perfil real (o `demo` solo en desarrollo), verificar `GET /api/publicaciones` con el adaptador y decidir si `para-ti` debe usar otro criterio; el frontend ya existente mantiene su contrato propuesto.
- Para 061/062: edición, eliminación y reportes siguen sin implementarse en backend. Los servicios del frontend 061 apuntan a rutas propuestas; deben confirmarse con DTO/controller propios antes de habilitarlos.
