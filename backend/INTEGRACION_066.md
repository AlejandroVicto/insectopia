# Integración 066 — Gestión de conversaciones (backend)

Actividad 066: listar usuarios seguidos, abrir/recuperar chats directos y ocultar conversaciones por participante. Compatible con el frontend 063/065 y con la bandeja 064 ya publicada (`5ec1f1f`).

## 1. Endpoints

Todos requieren JWT con autoridad `CONTENIDO_LEER` (`USUARIO`, `MODERADOR` o `ADMIN`, según `Permissions`). La identidad del usuario autenticado se obtiene siempre de Spring Security (`@AuthenticationPrincipal InsectopiaUserDetails.idUsuario()`); nunca del cuerpo ni de parámetros.

| Método | Ruta | Éxito | Descripción |
|---|---|---|---|
| `GET` | `/api/usuarios/seguidos?page=0&size=20&q=` | `200` | Seguidos del usuario del JWT. |
| `POST` | `/api/conversaciones` | `201` crea / `200` reutiliza | Abre o recupera un chat directo. |
| `PATCH` | `/api/conversaciones/{id}/ocultar` | `200 {"oculta":true}` | Oculta solo para el participante autenticado. |

### 1.1 `GET /api/usuarios/seguidos`

Parámetros:

- `page` ≥ 0 (por defecto `0`).
- `size` 1–50 (por defecto `20`).
- `q` opcional, hasta 100 caracteres; búsqueda por `nombre` o `nombreUsuario`, sin distinción de mayúsculas. Se aplica en MySQL, antes de `LIMIT/OFFSET`.

Respuesta (contrato reutilizado de 064, `PaginaDTO`):

```json
{
  "content": [
    {
      "id": 7,
      "nombre": "Clara Ríos",
      "nombreUsuario": "clara.rios",
      "avatarUrl": null,
      "descripcion": "Observación de libélulas",
      "loSigo": true
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

Reglas:

- Consulta real sobre la tabla `seguidores`: `s.seguidor.idUsuario = JWT`, invirtiendo la dirección de la relación no se listan quienes me siguen.
- Se excluye al propio usuario y a cuentas con `estado != ACTIVO`.
- Orden estable: `lower(nombre)`, `lower(nombreUsuario)`, `idUsuario`.
- DTO público: no expone correo, contraseña, token, teléfono ni entidades JPA.
- No existe parámetro para consultar seguidos ajenos; `userId=...` se ignora.

### 1.2 `POST /api/conversaciones`

Cuerpo admitido (campo desconocido ⇒ `400`):

```json
{ "destinatarioId": 7 }
```

- Cualquier campo adicional, en especial `remitenteId`, se rechaza con `HttpMessageNotReadableException` ⇒ `400`.
- `destinatarioId` debe ser positivo; ausencia, cero o negativo ⇒ `400`.
- Autoconversación (`destinatarioId == JWT`) ⇒ `400` con `details[0].field = "destinatarioId"`.
- Destinatario inexistente o inactivo ⇒ `404`.
- Crear con alguien a quien no se sigue ⇒ `403`.
- Sin JWT o JWT inválido ⇒ `401`.

Respuesta: el DTO completo de 063/065, el mismo que devuelve la bandeja 064:

```json
{
  "id": 15,
  "interlocutor": {
    "id": 7,
    "nombre": "Clara Ríos",
    "nombreUsuario": "clara.rios",
    "avatarUrl": null,
    "loSigo": true
  },
  "ultimoMensaje": null,
  "noLeidos": 0,
  "oculta": false
}
```

### 1.3 `PATCH /api/conversaciones/{id}/ocultar`

- Sin cuerpo.
- Conversación inexistente ⇒ `404`.
- Conversación existente de la que el JWT no es participante ⇒ `403`.
- Respuesta `200 {"oculta":true}` (025/065 acepta también `204`).
- No elimina la conversación, los participantes ni los mensajes; solo cambia `ParticipanteConversacion.oculta` de la fila del autenticado.

## 2. Política de recuperación de ocultas

Decisión implementada, documentada y probada:

1. **Abrir explícitamente**: `POST /api/conversaciones` con el mismo destinatario pone `oculta = false` únicamente en la fila del solicitante. La fila del interlocutor no se toca. Devuelve `200` porque la conversación ya existía.
2. **Mensaje nuevo**: `POST /api/conversaciones/{id}/mensajes` pone `oculta = false` únicamente al destinatario. El remitente conserva su estado: si había ocultado la conversación, sigue oculta para él aunque envíe.
3. **Dejar de seguir**: no oculta ni desoculta nada. Las conversaciones ya creadas se pueden reutilizar sin exigir seguimiento; el seguimiento solo se exige para crear una nueva. Esto evita perder el historial por unfollow.
4. La bandeja 064 sigue excluyendo de su listado solo las conversaciones con `oculta = true` del JWT, sin cambios en su contrato.

## 3. Creación, reutilización y duplicados

- Clave canónica `clave_directa = "directa:<idMenor>:<idMayor>"`, con columna única en BD.
- Antes de crear se busca por esa clave. También se buscan conversaciones directas preexistentes por par de participantes (datos semilla de 036 usan otras claves) y se exige exactamente dos participantes.
- Una conversación reutilizada debe tener exactamente los dos participantes esperados; si no, se responde `409` con `details[0].field = "claveDirecta"` en lugar de devolver una conversación ambigua.
- Toda la operación crear/reutilizar es transaccional (`TransactionTemplate`). Ante `DataIntegrityViolationException` por carrera de dos peticiones simultáneas, se reintenta la búsqueda en una transacción limpia y se devuelve la conversación ganadora con `200`; no se inserta un duplicado.
- El DTO se construye con el mismo mapeo que 064 (`MensajesService.conversacionPorId`), sin devolver entidades.

## 4. Cambios en el backend

| Archivo | Cambio |
|---|---|
| `dtos/mensajes/AbrirConversacionRequestDTO.java` | cuerpo estricto; rechaza `remitenteId` y valida `destinatarioId`. |
| `dtos/mensajes/SeguidoResponseDTO.java` | DTO público de seguidos con `loSigo = true`. |
| `repository/SeguidorRepository.java` | `buscarSeguidos(...)`: búsqueda/filtro/paginación en MySQL, estable y sin el propio usuario. |
| `repository/ParticipanteConversacionRepository.java` | participación propia, conteo de participantes y búsqueda de directas por par. |
| `services/GestionConversacionesService.java` | listar seguidos, abrir/recuperar, desocultar individual, ocultar, reintento por unicidad. |
| `services/MensajesService.java` | `conversacionPorId(...)` para 066 y reaparición solo para el destinatario al enviar. |
| `controllers/SeguidosController.java` | `GET /api/usuarios/seguidos`. |
| `controllers/MensajesController.java` | `POST /api/conversaciones` y `PATCH /api/conversaciones/{id}/ocultar`. |
| `bruno/15`–`bruno/23`, `environments/Local.bru`, `bruno/README.md` | peticiones y variables sin secretos reales. |
| `INTEGRACION_066.md` | este documento. |

Sin migraciones Flyway nuevas: V4 ya crea `conversaciones`, `participantes_conversacion` y `mensajes`, y `clave_directa` ya es única. No se ha tocado ninguna migración ni datos existentes.

## 5. Pruebas

Ejecutadas con `backend/mvnw.cmd`, cargando `backend/.env` en el proceso y usando `DB_NAME=insectopia_modelo_nuevo` para las integraciones (el esquema `insectopia` local estaba desactualizado en 064; no se modifica su configuración).

- `GestionConversacionesServiceTests` (11): mapeo público/loSigo, paginación vacía, crear con dos participantes, no seguido, autoconversación, inexistente/inactivo, reutilizar semilla y clave, desocultar solo al solicitante, ocultar solo propio, ajeno/inexistente, carrera por clave única.
- `MensajesServiceTests` (9, ampliados): DTO completo para 066 y reaparición por mensaje solo al destinatario.
- `MensajesMvcTests` (17, ampliados): `401` sin JWT, contrato React y campos prohibidos, distinción `201`/`200`, mapeo `400`/`403`/`404`, confirmación `200 {"oculta":true}` y ausencia de datos sensibles.
- `RepositoriosMensajes066IntegrationTests` (2, MySQL real, transacciones revertidas): seguidores vs seguidos, búsqueda antes de paginar, consulta de directas por participantes, ocultación individual y preservación de mensajes.
- Suite completa: todas las clases en verde; una prueba en vivo (`CountriesNowClientLiveTests`) se omite por diseño. No se usaron ni versionaron JWT ni contraseñas.

## 6. Compatibilidad y pendientes

- 063/065: rutas, nombres de DTO, `loSigo`, paginación y aceptación de `204`/`200` en ocultar se mantienen. No hizo falta modificar el frontend.
- 064: bandeja, historial, envío, `noLeidos`, `fechaLectura = null` y orden quedan intactos; el único cambio es la reaparición individual documentada al enviar.
- Pendiente para el siguiente actividad: 068 (tiempo real/WebSockets) y 062; deliberadamente fuera de alcance.
- Verificación HTTP desde Bruno no se ejecutó desde la UI ni contra un servidor levantado; las peticiones son equivalentes a las comprobaciones automatizadas y usan variables de entorno para datos demo.
