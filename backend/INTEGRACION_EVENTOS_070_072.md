# Actividades 070 y 072 — Eventos y participación

## Estado y alcance

Se implementaron las rutas, DTO, servicio, consultas y conexión al frontend actual. **La integración contra MySQL no pudo ejecutarse en este entorno**: no hay `DB_NAME=insectopia_test`, `DB_USER`, `DB_PASSWORD` ni cliente MySQL disponibles. La prueba de integración incluida está protegida para que sólo se ejecute con `DB_NAME=insectopia_test`; hasta ejecutarla y revisar el esquema efectivo no se puede afirmar que se haya verificado el funcionamiento real en MySQL. No se abrió ni modificó la base de desarrollo.

Se reutilizan `eventos`, `participantes_evento`, `notificaciones` y `usuarios` tal como aparecen en V6 y las entidades actuales. **No se creó ni se modificó ninguna migración ni se cambió el esquema.** Los estados de moderación APROBADO/RECHAZADO se leen pero no se conceden acciones de aprobación/rechazo (actividad 086).

## Backend: archivos

- Nuevos: `controllers/EventoController.java`, `services/EventoService.java`, `dtos/eventos/{DatosEvento,EventoRequestDTO,EventoUpdateRequestDTO,EventoResponseDTO}.java`, `exceptions/EventoConflictoException.java`, `src/test/java/com/insectopia/services/{EventoServiceTests,EventoRequestDTOTests}.java`, `src/test/java/com/insectopia/EventosMySqlIntegrationTests.java`.
- Modificados: `repository/{EventoRepository,ParticipanteEventoRepository}.java`, `services/NotificacionService.java`, `controllers/GlobalExceptionHandler.java`.
- Se conservaron los métodos originales de `EventoRepository` utilizados por `DatabaseSeeder` y sus pruebas.
- Fotografías: `services/AlmacenamientoEventosConfig.java` configura almacenamiento separado; se amplían `EventoController`, `EventoService`, `SecurityConfig` y las pruebas de `EventoService`. `AlmacenamientoImagenesService` mantiene la instancia original como primaria para Publicaciones.

## API (JWT obligatorio)

| Método y ruta | Comportamiento |
| --- | --- |
| `GET /api/eventos` | Sólo APROBADO; `proximos=true` acota desde ahora hasta antes de ahora + 30 días. |
| `GET /api/eventos/{id}` | APROBADO o propuesta propia; otros estados ajenos → 404. |
| `GET /api/eventos/mis-propuestas` | Eventos del proponente del JWT, cualquiera de los cuatro estados. |
| `GET /api/eventos/mis-participaciones` | Sólo registros INSCRITO del JWT; CANCELADO se omite. |
| `POST /api/eventos` | 201 + DTO y Location; crea PENDIENTE con proponente del JWT. |
| `PATCH /api/eventos/{id}` | 200 + DTO; formulario completo de siete campos, sólo propuesta PENDIENTE propia. |
| `DELETE /api/eventos/{id}` | 204; cancelación lógica de propuesta propia PENDIENTE o evento propio APROBADO sin inscripciones activas. En otro caso 409. No hay botón nuevo en React. |
| `POST /api/eventos/{id}/participantes/me` | 201 + DTO; inscribe o reactiva la fila CANCELADO. |
| `DELETE /api/eventos/{id}/participantes/me` | 204; cambia INSCRITO a CANCELADO, conserva la fila. |

Los listados admiten `page` (desde 0), `size` (1–50), `q` (máximo 100), `estado`, `periodo` (`futuros|pasados`), `fechaDesde` y `fechaHasta` (ISO date). El listado público rechaza estados distintos de APROBADO, incluso con un parámetro manipulado. Las consultas de propuestas y participaciones siempre fijan el usuario por JWT *antes* de aplicar los filtros. `fechaDesde` es inclusiva y `fechaHasta` inclusiva en días (límite exclusivo del día siguiente), aplicadas a `fecha_inicio`. Los intervalos invertidos y las fechas inválidas devuelven 400. `periodo` se calcula en el servidor; `proximos=true` prohíbe `periodo=pasados` y acota la intersección con las fechas explícitas.

El horario predeterminado del módulo es `America/Mexico_City`, configurable mediante `insectopia.eventos.zone`; se usa para las reglas temporales y el rango móvil de 30 días. `LocalDateTime` continúa sin zona en el JSON ni en `DATETIME`; debe acordarse operativamente esta zona con el despliegue si se utiliza otra zona de Insectopia.

`EventoRequestDTO` y `EventoUpdateRequestDTO` aceptan únicamente título, descripción, ubicación, imagen (nula en JSON), inicio, fin y cupo; rechazan campos desconocidos como `estado`, IDs y atributos administrativos. Bean Validation exige textos no blancos y límites de 150/255/500, fechas obligatorias y cupo positivo; el servicio exige inicio futuro y fin posterior. La imagen se sube por separado como archivo. No se devuelve ninguna entidad JPA. `EventoResponseDTO` contiene el proponente **sólo con nombre y nombreUsuario**, conteo INSCRITO, estado de inscripción del JWT, `esPropio` y motivo únicamente si la propuesta RECHAZADA es propia. Errores: 400 datos, 401 autenticación, 403 autoridad, 404 ajeno/inexistente, 409 conflicto (incluido cupo/duplicado).

La búsqueda se aplica en SQL sobre `lower(titulo|descripcion|ubicacion)` con comodines escapados. Las páginas llevan orden estable `fechaInicio ASC, idEvento ASC` y se convierten al `PaginaDTO<T>` existente. `@EntityGraph` obtiene el proponente de cada página; dos consultas agregadas obtienen conteos y estado del usuario para todos los IDs de la página, evitando N+1. Las propuestas PENDIENTE/RECHAZADO ajenas jamás son públicas.

## Cupos, transacciones, avisos y canales externos

La inscripción/cancelación bloquea el registro de `eventos` con `PESSIMISTIC_WRITE` dentro de `@Transactional`. Tras adquirir el bloqueo se valida APROBADO y que el evento aún no haya comenzado, se busca la clave compuesta `(id_evento,id_usuario)`, se cuentan sólo INSCRITO y se compara con `cupo_maximo`. Duplicado activo y cupo lleno → 409; una fila CANCELADO se reutiliza actualizando inscripción, estado y cancelación. Cancelar usa el mismo bloqueo, conserva la fila y registra fecha de cancelación; repetir la operación → 409, sin nuevo aviso. La cancelación del evento se rechaza con participantes activos. Se registra aviso interno relacionado con el evento en la misma transacción mediante `NotificacionService.porParticipacion`, sólo después de una transición efectiva. Las rutas de lectura de Notificaciones no inventan enlaces navegables a eventos.

`usuarios.telefono`, `recibir_sms` y `recibir_whatsapp` existen, pero **no hay proveedor SMS/WhatsApp real configurado** en el backend. No se envían mensajes externos, aunque haya consentimiento; no se simula envío. La futura integración debe verificar número y consentimiento y despachar *después del commit*; no se habilitó transporte sin autorización.

## Fotografías de eventos

Los formularios de propuesta y edición ya no solicitan una URL: seleccionan JPG/PNG (máximo 5 MB), previsualizan, sustituyen y quitan el archivo. Tras `POST /api/eventos` o `PATCH /api/eventos/{id}` (JSON con `imagen: null`), el frontend hace `POST /api/eventos/{id}/imagen` con `multipart/form-data` y campo `imagen`; para quitar una fotografía guardada usa `DELETE /api/eventos/{id}/imagen`. Si falla la subida tras confirmar el evento, conserva el ID y el modal abierto para reintentar únicamente el archivo o terminar sin fotografía; el listado se recarga. Los JSON con imagen no vacía se rechazan y PATCH no modifica la imagen existente.

El archivo se puede cambiar directamente con el selector nativo; se quitaron los botones redundantes «Sustituir imagen» y «Quitar imagen seleccionada». Se conserva «Quitar fotografía actual» en edición para eliminar una imagen que ya está guardada. `EventoImagenMvcTests` verifica el endpoint multipart autenticado y la lectura de imágenes sin JWT cuando son públicas. Las solicitudes con `Content-Type` incorrecto devuelven 415, no 500. **Después de actualizar el código es necesario reiniciar el proceso del backend**: un proceso arrancado antes de añadir `/api/eventos/{id}/imagen` responderá como si la ruta no existiera aunque el frontend esté actualizado.

El servicio reutiliza el validador/reencoder/almacenamiento UUID de Publicaciones, configurado para **otro directorio** (`app.storage.eventos.path`, por defecto `./uploads/eventos`). `eventos.imagen` contiene sólo `eventos/<UUID>.jpg|png`, nunca bytes ni una URL del usuario; ninguna migración es necesaria. En sustituciones el archivo anterior se elimina después del commit; en rollback se elimina el nuevo. El endpoint `GET /api/eventos/{id}/imagen` sirve fotos aprobadas públicamente; las fotos pendientes/rechazadas/canceladas requieren JWT del proponente (las pendientes se solicitan con Axios y se presentan como blob para no divulgar propuestas ajenas). El adaptador transforma la ruta guardada en la URL de lectura para tarjetas y detalles. Las fotografías antiguas con URL permanecen intactas al editar; no se convierten ni se eliminan del filesystem de Publicaciones.

## Frontend: archivos e integración

- Modificados: `src/services/{eventosService.js,eventosService.test.js}`, `src/pages/{Eventos.jsx,Eventos.test.jsx}`, `src/components/eventos/{EventosFiltros.jsx,EventoFormulario.jsx,EditarEventoModal.jsx,ConfirmarInscripcionModal.jsx,CancelarInscripcionModal.jsx,EventosModales.test.jsx,validarEvento.js}`, `src/data/eventosDemo.js`.
- Fotografías: se amplían `src/adapters/{eventosAdapter.js,eventosAdapter.test.js}`, `src/services/{eventosService.js,eventosService.test.js}` y `src/components/eventos/{useEventoFormulario.js,EventoFormulario.jsx,EventoCard.jsx,EventoDetalleContenido.jsx,EditarEventoModal.jsx,EventosModales.test.jsx}`; se añaden `src/components/eventos/{ImagenEvento.jsx,ImagenEvento.test.jsx}`.
- Se conservan Navbar, Sidebar, encabezado, estilos y disposición de tarjetas, detalle y modales. Sólo están las cuatro pestañas actuales: **Todos los eventos**, **Próximos 30 días**, **Mis participaciones**, **Mis propuestas**. No se reintrodujeron las dos pestañas eliminadas.
- Todos usa `GET /api/eventos`; próximos agrega `proximos=true`; participaciones y propuestas consultan sus propias rutas paginadas. Filtros y búsqueda se envían al backend antes de paginar, no se filtra una página real en React. En los listados públicos no se muestra un selector Estado: el backend devuelve exclusivamente APROBADO; las pestañas privadas conservan el selector para sus estados y la opción «Sin filtrar». En próximos se oculta la opción contradictoria Pasados. Limpiar filtros conserva `tab`, borra controles y vuelve a `page=0`.
- Los selectores nativos de fecha/hora de los formularios de eventos usan un icono lima de alto contraste y el tema oscuro, sin afectar otros formularios.
- Los cuatro servicios de escritura usan Axios real con JWT; propuesta cierra tras 201 y selecciona Mis propuestas; edición, inscripción y cancelación recargan desde el servidor después del éxito. No hay actualización optimista. El modo `VITE_EVENTOS_MOCK=true` sigue siendo de sólo lectura: sus operaciones se rechazan explícitamente sin Axios. Fallos HTTP/red no activan fixtures. Los avisos de “backend pendiente” se retiraron de modales reales.
- El frontend aún muestra contenido demo solo si el flag está activado; para datos MySQL se necesita `VITE_EVENTOS_MOCK=false`, backend disponible y aprobación administrativa (086) para que aparezcan eventos en el listado público.

## Pruebas y limitaciones verificadas

- `frontend`: `npm run lint` correcto; `npm run build` correcto (advertencia de bundle 543,91 kB >500 kB); `npm test -- --run --maxWorkers=4`: **25 archivos, 270 pruebas correctas**. La ejecución sin limitar workers tuvo fallos intermitentes por tiempos de espera; el límite de cuatro workers estabilizó la suite sin cambiar pruebas ajenas.
- `backend`: `./mvnw.cmd -q '-Dtest=EventoImagenMvcTests,EventoServiceTests,EventoRequestDTOTests,AlmacenamientoImagenesServiceTests,EventosMySqlIntegrationTests' test`: **18 pruebas correctas y 1 omitida**; `./mvnw.cmd -q -DskipTests package` correcto. La prueba de integración con MySQL sigue sin ejecutarse por ausencia de `DB_NAME=insectopia_test`; la suite completa con acceso a BD no se ejecutó para no apuntar a la base de desarrollo.
- La prueba de integración opt-in comprueba columnas existentes, serialización JPA, dos solicitudes concurrentes al último cupo, un solo INSCRITO y aviso, lectura del JWT, cancelación/reinscripción y limpieza de sus propios fixtures. **Debe ejecutarse con credenciales explícitas de `insectopia_test`** antes de considerar verificados los endpoints contra MySQL; sus resultados no se presuponen aquí.
- No se habilitó moderación 086 ni mensajería externa. No se ejecutó `flyway repair` ni operaciones sobre el esquema de desarrollo.
