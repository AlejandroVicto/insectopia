# Actividad 086 — Moderación de propuestas de eventos

Contrato definitivo para el panel React de la actividad 085. Los reportes **no se duplican**: se siguen usando `GET /api/reportes` y `PATCH /api/reportes/{id}/resolver` tal como existen.

## Alcance y autorización

Todas las rutas exigen JWT. La fila de usuario se recarga desde la base en cada petición, por lo que un cambio de rol, desactivación o revocación invalida el token.

| Operación | Autoridad | Roles que la poseen |
| --- | --- | --- |
| Listar propuestas | `EVENTO_REVISAR` | `MODERADOR`, `ADMINISTRADOR` |
| Aprobar / rechazar | `EVENTO_RESOLVER` | `MODERADOR`, `ADMINISTRADOR` |
| Listar reportes (ruta existente) | `REPORTE_REVISAR` | `MODERADOR`, `ADMINISTRADOR` |
| Resolver reportes (ruta existente) | `REPORTE_RESOLVER` | `MODERADOR`, `ADMINISTRADOR` |

`USUARIO` recibe 403 aunque envíe un token válido. La autorización está en Spring Security (`@PreAuthorize`) y se vuelve a comprobar en el servicio; nunca depende de que React oculte botones.

## Endpoints nuevos

| Método | Ruta | Cuerpo | Resultado |
| --- | --- | --- | --- |
| `GET` | `/api/moderacion/eventos/propuestas` | — | `200` + `PaginaDTO<PropuestaEventoDTO>` |
| `PATCH` | `/api/moderacion/eventos/{id}/aprobar` | sin cuerpo | `200` + `PropuestaEventoDTO` |
| `PATCH` | `/api/moderacion/eventos/{id}/rechazar` | `{"motivo":"..."}` | `200` + `PropuestaEventoDTO` |

### Parámetros del listado

| Parámetro | Tipo | Default | Regla |
| --- | --- | --- | --- |
| `page` | entero | `0` | `>= 0` |
| `size` | entero | `20` | `1..50` |
| `q` | texto | — | Máx. 100 caracteres; busca titular, descripción y ubicación en SQL, sin distinción de mayúsculas. |
| `estado` | enum | `PENDIENTE` | Sólo `PENDIENTE`, `APROBADO` o `RECHAZADO`. `CANCELADO` no es una decisión de moderación y devuelve 400. |
| `fechaDesde` | `yyyy-MM-dd` | — | Inclusiva, aplicada a `fechaInicio`. |
| `fechaHasta` | `yyyy-MM-dd` | — | Inclusiva en día (límite exclusivo del día siguiente), aplicada a `fechaInicio`. |

Orden fijo y estable: `fechaCreacion DESC, idEvento DESC`. Los filtros se aplican en SQL antes de paginar. Un rango invertido devuelve 400.

Ejemplo:

```http
GET /api/moderacion/eventos/propuestas?page=0&size=20&q=oaxaca&estado=PENDIENTE&fechaDesde=2027-01-01&fechaHasta=2027-01-31
Authorization: Bearer <JWT>
```

### `PropuestaEventoDTO`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `idEvento` | `number` | Identificador de la propuesta. |
| `titulo`, `descripcion`, `ubicacion` | `string` | Contenido enviado por el proponente. |
| `imagen` | `string \| null` | Ruta interna `eventos/<UUID>.jpg\|png`; **no es una URL pública**. |
| `fechaInicio`, `fechaFin` | `string` | `LocalDateTime` sin zona, formato ISO `yyyy-MM-ddTHH:mm:ss`. |
| `cupoMaximo` | `number` | Cupo propuesto. |
| `fechaCreacion` | `string` | Fecha de envío de la propuesta. |
| `estado` | `string` | `PENDIENTE`, `APROBADO` o `RECHAZADO`. |
| `proponente` | `{ idUsuario, nombre, nombreUsuario } \| null` | Datos públicos mínimos; `null` si la cuenta fue eliminada. |
| `moderadorId` | `number \| null` | Usuario que resolvió, tomado del JWT. `null` mientras está pendiente. |
| `motivoResolucion` | `string \| null` | Motivo del rechazo; `null` en aprobaciones y propuestas pendientes. |
| `fechaResolucion` | `string \| null` | Fecha de la decisión definitiva. |

Ejemplo de respuesta del listado:

```json
{
  "content": [
    {
      "idEvento": 12,
      "titulo": "Polillas de Oaxaca",
      "descripcion": "Muestreo nocturno en la reserva",
      "ubicacion": "Oaxaca",
      "imagen": "eventos/11111111-1111-1111-1111-111111111111.jpg",
      "fechaInicio": "2027-02-01T09:00:00",
      "fechaFin": "2027-02-01T18:00:00",
      "cupoMaximo": 30,
      "fechaCreacion": "2026-11-20T10:00:00",
      "estado": "PENDIENTE",
      "proponente": { "idUsuario": 7, "nombre": "Ana", "nombreUsuario": "ana" },
      "moderadorId": null,
      "motivoResolucion": null,
      "fechaResolucion": null
    }
  ],
  "number": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "first": true,
  "last": true
}
```

### Aprobar

```http
PATCH /api/moderacion/eventos/12/aprobar
Authorization: Bearer <JWT>
```

No requiere cuerpo. Respuesta `200`:

```json
{
  "idEvento": 12,
  "titulo": "Polillas de Oaxaca",
  "descripcion": "Muestreo nocturno en la reserva",
  "ubicacion": "Oaxaca",
  "imagen": "eventos/11111111-1111-1111-1111-111111111111.jpg",
  "fechaInicio": "2027-02-01T09:00:00",
  "fechaFin": "2027-02-01T18:00:00",
  "cupoMaximo": 30,
  "fechaCreacion": "2026-11-20T10:00:00",
  "estado": "APROBADO",
  "proponente": { "idUsuario": 7, "nombre": "Ana", "nombreUsuario": "ana" },
  "moderadorId": 9,
  "motivoResolucion": null,
  "fechaResolucion": "2026-11-22T12:00:00"
}
```

### Rechazar

```http
PATCH /api/moderacion/eventos/12/rechazar
Authorization: Bearer <JWT>
Content-Type: application/json
```

```json
{ "motivo": "La fecha de inicio ya pasó" }
```

`motivo` es obligatorio, no puede estar en blanco y admite hasta 500 caracteres. Se recortan espacios periféricos. Se rechazan campos desconocidos como `estado`, `moderadorId` o `fechaResolucion`.

Respuesta `200`:

```json
{
  "idEvento": 12,
  "titulo": "Polillas de Oaxaca",
  "descripcion": "Muestreo nocturno en la reserva",
  "ubicacion": "Oaxaca",
  "imagen": "eventos/11111111-1111-1111-1111-111111111111.jpg",
  "fechaInicio": "2027-02-01T09:00:00",
  "fechaFin": "2027-02-01T18:00:00",
  "cupoMaximo": 30,
  "fechaCreacion": "2026-11-20T10:00:00",
  "estado": "RECHAZADO",
  "proponente": { "idUsuario": 7, "nombre": "Ana", "nombreUsuario": "ana" },
  "moderadorId": 9,
  "motivoResolucion": "La fecha de inicio ya pasó",
  "fechaResolucion": "2026-11-22T12:15:00"
}
```

## Transiciones, concurrencia y trazabilidad

- La única transición permitida es `PENDIENTE → APROBADO` o `PENDIENTE → RECHAZADO`.
- Se adquiere `PESSIMISTIC_WRITE` sobre la fila del evento y se vuelve a comprobar el estado dentro de la transacción. Dos decisiones concurrentes no pueden contradecirse: la segunda espera, observa el estado definitivo y recibe `409`.
- Se persisten `estado`, `id_moderador` (del JWT real), `motivo_resolucion` (sólo rechazo) y `fecha_resolucion` en la misma transacción.
- No se cambia el proponente ni se altera el historial de inscripciones.
- Las decisiones repetidas no generan una segunda respuesta de éxito ni un segundo aviso.

## Notificaciones

`NotificacionService.porResolucionEvento` crea, dentro de la misma transacción, un aviso para el proponente con tipo `EVENTO_APROBADO` o `EVENTO_RECHAZADO`. No notifica si el proponente es el propio moderador, si la cuenta fue eliminada o si ya existe un aviso de ese tipo para ese evento y destinatario. La identidad del moderador no se expone como `actor`.

En `GET /api/notificaciones` el aviso aparece con `recurso.tipo = "EVENTO"`, `recurso.disponible = false`, `recurso.apiUrl = null` e `id = null`: no se inventa una ruta de detalle ajena. No se crean ni modifican notificaciones de reportes; ésas siguen gobernadas por `ReportesService`.

Para previsualizar la imagen de una propuesta pendiente, el panel debe usar `GET /api/eventos/{id}/imagen` con el JWT del moderador. El servicio permite ese acceso cuando el usuario tiene `EVENTO_REVISAR`. El campo `imagen` del DTO es una ruta de almacenamiento, no una URL navegable.

## Reportes: contrato conservado

| Método | Ruta | Permiso | Cambios en 086 |
| --- | --- | --- | --- |
| `POST` | `/api/reportes` | `PUBLICACION_REPORTAR` | Ninguno. |
| `GET` | `/api/reportes` | `REPORTE_REVISAR` | Ninguno; `page`, `size`, `estado`; responde `PaginaDTO<ReporteResponseDTO>`. |
| `PATCH` | `/api/reportes/{id}/resolver` | `REPORTE_RESOLVER` | Ninguno; cuerpo `{ "estado": "RESUELTO\|RECHAZADO", "resolucion": "..." }`. |

No existe `/api/moderacion/reportes` ni una segunda implementación de resolución de reportes. El panel 085 debe seguir llamando a las rutas anteriores.

## Errores

Todos los errores usan `ErrorResponseDTO`: `{ "status", "message", "path", "details?" }`.

| Código | Situación |
| --- | --- |
| `400` | Parámetros fuera de rango, fechas invertidas, estado no moderable, JSON inválido, `motivo` vacío o demasiado largo, campo desconocido. |
| `401` | Sin JWT, JWT inválido/revocado/desactualizado o usuario inactivo. |
| `403` | Usuario autenticado sin la autoridad requerida. |
| `404` | Propuesta inexistente o cuenta del moderador inexistente. |
| `409` | La propuesta ya tiene resolución definitiva; también cubre la segunda decisión concurrente. |
| `500` | Error interno no controlado; se registra en el servidor sin exponer detalles. |

Ejemplo de conflicto:

```json
{
  "status": 409,
  "message": "La propuesta ya tiene una resolución definitiva",
  "path": "/api/moderacion/eventos/12/rechazar"
}
```

## Pruebas y esquema

- No se creó ni modificó ninguna migración. V6 ya contiene `id_moderador`, `motivo_resolucion` y `fecha_resolucion`; V5 define `tipo` como `VARCHAR(40)`, suficiente para los dos tipos nuevos.
- Las pruebas unitarias y MVC usan mocks; la prueba MySQL de concurrencia es opt-in y sólo se ejecuta con `DB_NAME=insectopia_test`. Nunca apunta a la base de desarrollo.
- No se modificaron `frontend/`, `application.properties`, `.env`, usuarios/roles, mensajes privados ni migraciones históricas.
