# Integración backend 064 — conversaciones y mensajes JWT

> Actualización posterior 063–068: las frases históricas de este documento sobre ausencia de avisos y lectura se sustituyen por el contrato definitivo en `backend/INTEGRACION_NOTIFICACIONES_068.md` y `frontend/INTEGRACION_MENSAJES.md`. Envío ahora crea aviso `MENSAJE` transaccional, y V11 habilita `PATCH /api/conversaciones/{id}/lectura` con límite por mensaje recibido.

Actividad 064: API de bandeja de conversaciones, historial de mensajes y envío, compatible con el contrato de la actividad 063 (`frontend/INTEGRACION_MENSAJES.md`) y con el adaptador `frontend/src/adapters/mensajesAdapter.js`.

**Sin WebSockets.** El frontend puede mantener el polling acordado; 064 solo expone HTTP paginado. No se crea ni oculta conversaciones (eso queda para 066) y no se generan notificaciones (068).

---

## 1. Endpoints

Todos requieren JWT (`Authorization: Bearer <token>`) y el permiso `CONTENIDO_LEER` (cualquier rol autenticado del proyecto).

| Método | Ruta | Query | Cuerpo | Respuesta |
|---|---|---|---|---|
| `GET` | `/api/conversaciones` | `page` (0, ≥0), `size` (20, 1–50), `q` (≤100, opcional), `noLeidos` (false) | — | `200` + `PaginaDTO<ConversacionResponseDTO>` |
| `GET` | `/api/conversaciones/{id}/mensajes` | `page` (0, ≥0), `size` (30, 1–100) | — | `200` + `PaginaDTO<MensajeResponseDTO>` |
| `POST` | `/api/conversaciones/{id}/mensajes` | — | `{"contenido":"Hola"}` | `201` + `MensajeResponseDTO` persistido |

Errores: `400` parámetros/cuerpo inválidos, `401` sin JWT, `403` conversación existente ajena, `404` conversación inexistente, `422` regla de negocio defensiva (contenido vacío/demasiado largo si llega sin validación Bean Validation).

### 1.1 Bandeja

Ejemplo de respuesta (datos sintéticos):

```json
{
  "content": [
    {
      "id": 4,
      "interlocutor": {
        "id": 5,
        "nombre": "Demo Clara Rios",
        "nombreUsuario": "demo.clara.rios",
        "avatarUrl": null,
        "loSigo": false
      },
      "ultimoMensaje": {
        "id": 51,
        "contenido": "[064-PRUEBA] verificacion persistencia",
        "fechaEnvio": "2026-11-20T23:35:10"
      },
      "noLeidos": 2,
      "oculta": false
    }
  ],
  "number": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "first": true,
  "last": true,
  "empty": false
}
```

- `q` busca por **nombre público o alias del interlocutor**, en minúsculas y escapando `%`, `_` y `\`; se aplica en SQL **antes** de paginar.
- `noLeidos=true` filtra conversaciones con mensajes de otros remitentes posteriores a `fechaUltimaLectura`; también se aplica en SQL antes de paginar.
- `noLeidos` se calcula en servidor: si `fechaUltimaLectura` es `null`, cuentan todos los mensajes ajenos; un empate exacto con la fecha de lectura se considera leído.
- Orden estable: `MAX(fechaEnvio)` del último mensaje DESC, `fechaCreacion` DESC, `idConversacion` DESC.
- Las conversaciones con `participantes_conversacion.oculta = true` para el usuario autenticado se excluyen en la consulta y además se filtran defensivamente en el servicio.
- `ultimoMensaje` es `null` si la conversación aún no tiene mensajes.
- N+1 evitado: una consulta paginada para la bandeja más consultas masivas para interlocutores, último mensaje, contadores y `loSigo`.

### 1.2 Historial

Página `0` = mensajes **más recientes**. Orden: `fechaEnvio DESC, idMensaje DESC` (el desempate por id hace estable la paginación por offset).

```json
{
  "content": [
    {
      "id": 51,
      "conversacionId": 4,
      "remitenteId": 4,
      "contenido": "Hola",
      "fechaEnvio": "2026-11-20T23:35:10",
      "fechaLectura": null
    }
  ],
  "number": 0,
  "size": 30,
  "totalElements": 1,
  "totalPages": 1,
  "last": true
}
```

`fechaLectura` siempre es `null` en 064: `Mensaje` no tiene esa columna y 064 no confirma lecturas reales. El frontend no debe mostrar «Visto» basado en este campo todavía. No se devuelven entidades JPA ni datos del remitente distintos de `remitenteId`.

### 1.3 Envío

Solo se acepta `contenido` (obligatorio, no vacío, ≤5000 caracteres, se recorta con `trim()`). El `remitenteId` se toma exclusivamente de `InsectopiaUserDetails.idUsuario()` del JWT; un campo `remitenteId` en el cuerpo se ignora y no puede suplantar al usuario.

Se guarda con `MensajeRepository.saveAndFlush` dentro de `@Transactional`, se comprueba la persistencia y se responde `201` con el DTO ya persistido (incluye el id generado). El contenido del cuerpo se redacta en `toString()` para que no aparezca en trazas de validación.

Punto de enganche para 068: tras `saveAndFlush` se podrá crear la `Notificacion` correspondiente (`Notificacion.mensaje` ya existe). 064 **no** crea notificaciones.

---

## 2. Seguridad

- La identidad nunca viene del cuerpo ni de parámetros: solo del principal de Spring Security.
- La pertenencia a la conversación se verifica **en cada solicitud** de historial y envío (`existsByConversacion_IdConversacionAndUsuario_IdUsuario`).
- Conversación ajena existente → `403` sin filtrar ningún mensaje; conversación inexistente → `404`. No se distingue entre «no existe» y «no es participante» a efectos de filtrado de datos.
- La bandeja solo devuelve filas del usuario autenticado y excluye las ocultas para ese usuario.
- Los DTOs públicos no exponen correo, teléfono, contraseña, token ni objetos JPA.
- No se registran JWT ni contenido de mensajes en logs. El token se envía solo en la cabecera y las peticiones Bruno lo guardan como variable secreta.

---

## 3. Archivos

### Nuevos

- `backend/src/main/java/com/insectopia/controllers/MensajesController.java`
- `backend/src/main/java/com/insectopia/services/MensajesService.java`
- `backend/src/main/java/com/insectopia/repository/ConteoNoLeidosProjection.java`
- `backend/src/main/java/com/insectopia/dtos/mensajes/MensajeCreateRequestDTO.java`
- `backend/src/main/java/com/insectopia/dtos/mensajes/MensajeResponseDTO.java`
- `backend/src/main/java/com/insectopia/dtos/mensajes/InterlocutorDTO.java`
- `backend/src/main/java/com/insectopia/dtos/mensajes/UltimoMensajeDTO.java`
- `backend/src/main/java/com/insectopia/dtos/mensajes/ConversacionResponseDTO.java`
- `backend/src/test/java/com/insectopia/services/MensajesServiceTests.java`
- `backend/src/test/java/com/insectopia/controllers/MensajesMvcTests.java`
- `backend/bruno/09-listar-conversaciones.bru` a `backend/bruno/14-sin-jwt-denegado.bru`
- `backend/INTEGRACION_064.md` (este documento)

### Modificados

- `backend/src/main/java/com/insectopia/repository/MensajeRepository.java`: historial ordenado, último mensaje masivo y conteo de no leídos.
- `backend/src/main/java/com/insectopia/repository/ParticipanteConversacionRepository.java`: bandeja filtrada/ordenada en SQL y carga masiva con usuario.
- `backend/src/main/java/com/insectopia/repository/SeguidorRepository.java`: ids seguidos masivos para `loSigo`.
- `backend/bruno/environments/Local.bru`: añade `conversacionId` y la variable secreta `tokenTercero` (sin sobrescribir `baseUrl`/`token`).
- `backend/bruno/README.md`: instrucciones de la colección 064.

No se añadieron migraciones: V4 ya cubre `conversaciones`, `participantes_conversacion` (`oculta`, `fecha_ultima_lectura`), `mensajes`, el índice `(id_conversacion, fecha_envio, id_mensaje)` y la FK compuesta `(id_conversacion, id_remitente)`.

No se modificó frontend, `application.properties` ni ningún commit ajeno. El cambio local preexistente en `application.properties` (`DB_PASSWORD=${DB_PASSWORD:}`) se dejó intacto. No se hizo commit ni push.

---

## 4. Pruebas y resultados

### Maven

```
.\mvnw.cmd -q -DskipTests compile                       -> OK
.\mvnw.cmd -q '-Dtest=MensajesServiceTests,MensajesMvcTests' test -> EXIT=0
```

- `MensajesServiceTests`: **8/8** (bandeja/mapeo, ocultas, búsqueda y `noLeidos`, orden del historial, pertenencia, envío con remitente del JWT, contenido inválido, conversación inexistente/ajena).
- `MensajesMvcTests`: **8/8** (401 en los tres endpoints, contrato del adaptador, validación de parámetros, contrato del historial, `201` con principal, `400`, `403`, `404`, sin datos sensibles).

Suite completa: **164 ejecutadas, 1 fallo, 3 errores, 1 omitida**. Los cuatro problemas son preexistentes y ajenos a 064; provienen del desfase entre el esquema de la base `insectopia` local y los archivos/migraciones actuales:

- Flyway V1: checksum aplicado `-474317959` vs. el local `-1114147793`.
- Falta la columna `usuarios.estado_region` en esa base.
- Afectan a `RepositoriosIntegrationTests.consultarUsuariosPorCorreo` y a tres pruebas de `UsuarioModeloIntegrationTests`.

Las pruebas nuevas y el resto de la suite (incluidas 060/061/seguridad) pasan. No se reparó ni sobrescribió esa base porque está fuera del alcance de 064.

### MySQL local (verificación segura)

El esquema principal `insectopia` está desactualizado (ver causa arriba), así que la verificación HTTP se hizo contra el esquema demo ya existente `insectopia_modelo_nuevo`, en el **mismo MySQL local**, sin queries de destrucción ni cambios de esquema. El usuario configurado no tiene permiso para crear esquemas, por lo que no se creó uno nuevo.

Se ejecutaron 20 comprobaciones equivalentes a la colección Bruno; **20 PASS / 0 FAIL**:

1. Bandeja con JWT, datos demo y DTO sin correo/contraseña/token.
2. `noLeidos` entero y `ultimoMensaje` con id/fecha o `null`.
3. Paginación real `page=0` vs `page=1` con `size=1`.
4. Búsqueda `q` por alias del interlocutor antes de paginar.
5. Filtro `noLeidos=true` sin resultados con contador 0.
6. Historial `200`, orden `fechaEnvio/id DESC`, `fechaLectura` presente y sin entidades JPA.
7. `POST` → `201`, persistencia visible en el historial y también para el otro participante.
8. Tercero ajeno no lee ni envía (`403`), sin JWT `401`, contenido vacío `400`.
9. Comprobación adicional: `remitenteId=4` coincide con `login.user.id` del token usado.

Dato insertado para la prueba (no eliminado, no se alteró ningún mensaje existente):

- Esquema: `insectopia_modelo_nuevo`
- Conversación: `id=4` (participantes demo Andrés/Clara)
- Mensaje: `id=51`, contenido `[064-PRUEBA] verificacion persistencia`
- Total de mensajes de esa conversación: 4 → 5

Si se desea limpiar ese registro, hacerlo manualmente en un entorno de desarrollo; 064 no borra datos.

---

## 5. Bruno

Colección en `backend/bruno`, entorno `Local`:

- `baseUrl=http://localhost:8080`
- `conversacionId` (ajustar a una conversación donde el usuario de `token` sea participante)
- secretos: `token` (participante) y `tokenTercero` (usuario ajeno)

Peticiones:

| Archivo | Objetivo |
|---|---|
| `09-listar-conversaciones.bru` | Bandeja paginada con `q` y `noLeidos` |
| `10-historial-mensajes.bru` | Historial, página 0 más reciente |
| `11-enviar-mensaje.bru` | `POST` 201; **inserta un mensaje en cada ejecución** |
| `12-tercero-historial-denegado.bru` | Tercero no lee |
| `13-tercero-enviar-denegado.bru` | Tercero no envía |
| `14-sin-jwt-denegado.bru` | Sin token → 401 |

Ejemplo de cuentas demo (clave en `DatabaseSeeder.CLAVE_DEMO`, no pegar tokens en la documentación):

- Participante A: `demo.andres.mora@insectopia.invalid`
- Participante B: `demo.clara.rios@insectopia.invalid`
- Tercero ajeno a la conversación 4: `demo.bruno.gil@insectopia.invalid`

---

## 6. Compatibilidad 063/065 y pendientes

Compatible con 063/065: nombres exactos de campos (`id`, `conversacionId`, `remitenteId`, `contenido`, `fechaEnvio`, `fechaLectura`; `interlocutor`, `ultimoMensaje`, `noLeidos`, `oculta`), contrato `Page` de Spring (`content`, `number`, `size`, `totalElements`, `totalPages`, `last`) y parámetros usados por `mensajesService.js` / `conversacionesService.js`. No fue necesario modificar frontend.

Pendiente documentado para actividades posteriores:

- **066**: crear conversación directa, ocultar/mostrar conversación y marcar como leída (`fechaUltimaLectura`); hoy `fechaLectura` sigue siendo `null`.
- **068**: crear notificaciones `NUEVO_MENSAJE` tras el guardado; 064 solo deja el punto de enganche.
- Contrato de idempotencia y límite de frecuencia para reintentos de `POST`: un timeout del cliente puede duplicar el mensaje.
- Definir zona horaria/offset de `LocalDateTime` entre servidor/MySQL y navegador (sin cambio de esquema en 064).
- Conversaciones grupales y `loSigo` en grupo: 064 resuelve un único interlocutor por conversación, igual que el contrato 063.
- Tiempo real (WebSockets/SSE) queda fuera de 064; el polling actual sigue siendo válido.
