# Mensajes 063 + 065 → backend 064 + 066 (contrato propuesto, NO implementado)

**Estado:** las tres columnas y los modales 065 están implementados en React; **ninguno** de los endpoints siguientes está verificado ni existe todavía en el backend. Las entidades JPA y repositorios existentes no son DTOs públicos. El frontend usa `services/api.js` (JWT en memoria de `AuthProvider`) y no accede a MySQL directamente. Configurar `VITE_API_URL` igual que para Inicio. Las solicitudes a estas rutas solo ocurren con `VITE_MENSAJES_MOCK=false`; en demo no se llama al backend de Mensajes.

## A. Bandeja — 064/066

Propuesta: `GET /api/conversaciones?page=0&size=20&q=texto&noLeidos=false`, con JWT obligatorio. `q` busca por **nombre público o alias** en *todas* las conversaciones visibles del participante; `noLeidos=true` filtra en servidor antes de paginar. No filtrar solo la página descargada. Ordenar por último mensaje reciente (o fecha de creación si está vacía) e ID de conversación como desempate; definir orden estable. No limitar a seguidos. Excluir `oculta=true` **solo para el participante autenticado**.

Respuesta propuesta, formato Spring Page (`number`, `size`, `totalPages`, `totalElements`, `last`, `content`):

```json
{"number":0,"size":20,"totalPages":1,"totalElements":1,"last":true,"content":[{"id":15,"interlocutor":{"id":7,"nombre":"TinkyW","nombreUsuario":"TinkyW","avatarUrl":null,"loSigo":true},"ultimoMensaje":{"id":101,"contenido":"Hola","fechaEnvio":"2026-11-20T08:47:00"},"noLeidos":2,"oculta":false}]}
```

`ultimoMensaje` puede ser `null`; `loSigo` puede omitirse o ser `null`; `noLeidos` debe ser entero no negativo calculado por backend (no inferido por React). El perfil solo muestra nombre, alias y avatar públicos. No devolver correo, contraseñas, tokens ni entidades JPA. Páginas sucesivas por botón «Cargar más conversaciones». Si cambia la búsqueda/filtro, se aborta la petición anterior y se reinicia la paginación. La selección no depende de que el chat continúe en la página filtrada.

## B. Historial — 064

Propuesta: `GET /api/conversaciones/{id}/mensajes?page=0&size=30` autenticado; verificar pertenencia del JWT a la conversación en **cada solicitud** (403/404 para ajenos, sin filtrar datos). Página 0 = **más recientes**, respuesta ordenada por `fechaEnvio DESC, id DESC` con desempate obligatorio (el repositorio actual solo ordena por fecha; ajustar en backend 064). React reordena cronológicamente ASC para pintar; botón «Cargar mensajes anteriores» pide página 1, 2… y preserva scroll. DTO mínimo:

```json
{"id":101,"conversacionId":15,"remitenteId":7,"contenido":"Hola, ¿qué especie encontraste?","fechaEnvio":"2026-11-20T08:40:00","fechaLectura":null}
```

`fechaLectura` **opcional**, mostrar «Visto» solo si backend confirma una lectura real. Fechas ISO 8601: acordar zona/UTC para evitar ambigüedad (el modelo JPA actual usa `LocalDateTime`). No usar HTML. Cliente reconcilia por ID y descarta respuestas de otro chat; polling cada `VITE_MENSAJES_POLL_MS` (mínimo 5000 ms, defecto 15000 ms), solo en pestaña visible, un request a la vez, retroceso exponencial en errores, abortado al salir/cambiar chat/cerrar sesión. Polling consulta página 0 y fusiona por ID; **no es tiempo real**. Con paginación por offset y actividad concurrente pueden desplazarse límites: para integridad total con mucho tráfico se recomienda cursor `(fechaEnvio,id)` estable para páginas anteriores y `afterId`/cursor para actualizaciones; acordar en 064. Conservar orden por ID en empates.

## C. Envío — 064

Propuesta: `POST /api/conversaciones/{id}/mensajes`, cuerpo `{ "contenido": "Hola" }`, JWT obligatorio; servidor obtiene remitente **exclusivamente del JWT**, valida participante, texto no vacío/tamaño máximo y devuelve el DTO de mensaje persistido (con ID, conversación y remitente reales). 400 texto inválido, 401 sesión inválida, 403/404 chat ajeno, 409 conflicto, 5xx/error de red. El frontend no inserta mensajes optimistas, bloquea envíos simultáneos, conserva el borrador tras fallo y solo pinta respuesta confirmada. Para proteger reintentos ante timeout después de persistir, acordar clave de idempotencia cliente-servidor en 064; sin ese contrato, un reintento manual podría duplicar el envío en base de datos. Texto simple, Enter envía, Shift+Enter agrega salto, IME no envía. El backend debe limitar tamaño/frecuencia y validar autorización en cada POST.

## D. Lectura y no leídos — por acordar en 064

`ParticipanteConversacion.fechaUltimaLectura` puede respaldar el contador: contar mensajes **de otros remitentes** posteriores al último punto leído para el participante, con semántica precisa para empates y zona horaria. Acordar cuándo marcar leído (al abrir, al visualizar, al cerrar), si abrir historial actualiza contador y si se envía endpoint `PUT /api/conversaciones/{id}/lectura` o equivalente. **063 no marca lectura ni decrementa contadores localmente.** Para indicar leído en mensajes propios, definir un DTO/confirmación real; no derivarlo del contador de la bandeja.

## E. Gestión de conversaciones — 066 (implementación backend pendiente)

**1. Personas que sigo, no la bandeja:** `GET /api/usuarios/seguidos?page=0&size=20&q=bosque` autenticado. `q` (opcional) busca por nombre público y nombre de usuario entre las cuentas que **el usuario del JWT sigue**; filtrar antes de paginar. Nunca incluir al propio usuario, bloquear registros no seguidos y exponer solo datos públicos. Formato paginado idéntico a A/B, respuesta propuesta:

```json
{"number":0,"size":20,"totalPages":1,"totalElements":1,"last":true,"content":[{"id":7,"nombre":"TinkyW","nombreUsuario":"TinkyW","avatarUrl":null,"descripcion":"Observación de escarabajos","loSigo":true}]}
```

`descripcion` y `avatarUrl` opcionales; **`loSigo:true` obligatorio para que React habilite la selección**. La fuente de autoridad debe ser `seguidores`, no el dato enviado por el navegador. React debounces 350 ms, aborta consultas al cambiar búsqueda y ofrece páginas adicionales/reintento. Una página 0 sin resultados y sin búsqueda muestra «Todavía no sigues a nadie»; una búsqueda sin resultados muestra «Sin coincidencias». La respuesta no debe incluir correo, teléfono, credenciales ni entidades JPA.

**2. Abrir o crear:** `POST /api/conversaciones` autenticado, cuerpo propuesto `{"destinatarioId":7}`; **no enviar remitente ni participante autenticado**. Validar en la transacción que el remitente del JWT siga actualmente al destinatario para iniciar un chat *nuevo*, que no sea el mismo usuario y que la conversación directa tenga exactamente dos participantes. Si ya existe, reutilizarla (incluida una oculta, que debe hacerse visible para el solicitante); clave directa única e inserción atómica para dos peticiones concurrentes. **Acordar:** al abrir una conversación existente con alguien que ya no sigo, el selector «Nuevo» no lo ofrece, pero la bandeja existente permite continuar escribiéndole; un acceso explícito desde otro flujo debería recuperar el chat sin requerir nuevo seguimiento. No crear duplicados ni borrar mensajes al dejar de seguir. Responder `200` si existe o `201` si se creó con el **DTO completo de conversación de A** y `oculta:false`, incluida la persona solicitada como interlocutor, `noLeidos` calculado por servidor, `ultimoMensaje:null` si está vacía. El frontend no cierra el modal ni selecciona el chat hasta adaptar y validar el DTO; después limpia búsqueda/filtro y recarga la bandeja.

**3. Ocultar:** `PATCH /api/conversaciones/{id}/ocultar` autenticado, sin cuerpo significativo. Comprobar pertenencia mediante JWT; solo cambiar `ParticipanteConversacion.oculta` para quien solicita. **Respuesta requerida:** `204 No Content` o `200 {"oculta":true}`. No hacer `DELETE`, no eliminar de MySQL los mensajes ni alterar al otro participante. El frontend mantiene abierto el diálogo ante error y descarta selección/historial **solo tras confirmación**. Política propuesta: conversación oculta reaparece para ese participante al abrirla explícitamente o recibir un mensaje nuevo; acordar exactamente con backend si la segunda condición modifica `oculta`, y cómo afecta al contador.

Errores sugeridos en las tres operaciones: `400` parámetros/texto inválidos o autochat, `401` JWT ausente/inválido (interceptor existente), `403` no seguido o no participante, `404` chat/usuario inexistente (sin filtrar información privada), `409` conflicto si no se puede resolver reutilización atómica, `429` límite de solicitudes y `5xx` problemas del servidor. En caso de error React **no simula éxito**; el backend debe validar pertenencia a la conversación en cada lectura, envío y modificación. La restricción de seguimiento corresponde únicamente al inicio de chats nuevos.

## F. Modales frontend — 065 (implementados)

«Nuevo» consulta solo seguidos, busca/pagina, selecciona destinatario y solicita crear/reutilizar; «Opciones» del chat muestra un menú con «Ocultar conversación», que abre la misma confirmación que el botón del perfil derecho. Los diálogos tienen foco inicial/trampa/restauración, Escape, fondo inerte, loading y error. En demo las acciones se identifican como **simulación local en memoria**; en modo API se envía únicamente la solicitud acordada y no hay fallback a fixtures. El perfil público no ofrece enlace hasta existir una ruta pública válida. No hay modal de perfil ni navegación ficticia.

## G. Integración y pruebas manuales

1. Para revisar sin backend: en `frontend/.env.local` (sin sobrescribir otros `.env`) establecer `VITE_MENSAJES_MOCK=true` y reiniciar Vite. Demostración identificada; «Nuevo» abre/reutiliza/oculta solo en memoria y el envío de mensajes sigue deshabilitado. Para API real: `VITE_MENSAJES_MOCK=false` (o variable ausente), configurar `VITE_API_URL` según `services/api.js`, reiniciar Vite. Un fallo HTTP muestra error y reintento, jamás fixtures.
2. Implementar y verificar los tres endpoints 064 (A/B/C) y los tres endpoints 066 (E), con la paginación y los DTOs descritos; adaptar nombres en `adapters/mensajesAdapter.js` solo tras acordarlos. Confirmar zona horaria, desempates, idempotencia, lectura y recuperación de chats ocultos. Probar 200/201 de creación y 204/200 confirmatorio de ocultación. Los componentes frontend 063/065 ya consumen estos servicios.
3. Iniciar dos sesiones distintas (navegadores separados); iniciar conversación con un seguido, intentar iniciar de nuevo y comprobar que devuelve el **mismo ID**, enviar, consultar en ambas sesiones y verificar IDs/remitente/contador. Probar tercero autenticado consultando, enviando y ocultando a la URL del chat: prohibir las tres operaciones en el backend. Probar autochat y destinatario no seguido.
4. Ocultar para el primer usuario y comprobar que el segundo todavía ve todo el historial; recuperar para el primero al abrir explícitamente y probar la política acordada cuando llega un mensaje. Dejar de seguir y comprobar que la conversación preexistente sigue accesible.
5. Verificar búsqueda por nombre y alias **en servidor** tanto en bandeja como entre seguidos, filtro no leídos antes de paginar, múltiples páginas, cambio de chat/búsqueda mientras hay solicitudes pendientes, polling con pestaña oculta, envío fallido/reintento y cierre de sesión. Verificar reglas de lectura solo después de acordar endpoint/semántica.

**Regla fundamental:** seguir restringe el *inicio* de chats nuevos, no la consulta ni continuidad de conversaciones existentes. La seguridad nunca depende de ocultar botones en React.
