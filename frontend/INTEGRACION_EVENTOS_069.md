# Eventos y Bioblitz 069 → backend 070 (contrato propuesto, NO implementado)

**Estado:** la pantalla real de escritorio `/app/eventos` está implementada en React y sustituye al placeholder. **No existe todavía** `EventoController`, DTO público ni endpoint `/api/eventos`; en el backend sólo están `Evento`, `ParticipanteEvento`, `EstadoEvento` y `EventoRepository`. Por eso el servicio propone rutas y parámetros, pero por defecto **sólo envía `page` y `size`**. La UI no simula escrituras, inscripciones ni propuestas: eso pertenece a las actividades 071 y 072.

## 1. Alcance de la actividad 069

Incluye encabezado editorial, pestañas, búsqueda/filtros, listado paginado, detalle lateral y estados de carga/vacío/error. No incluye backend, base de datos, Flyway, `application.properties`, inscripción real, mapa, coordenadas, penalizaciones ni diseño móvil. La actividad 071 añadió después la interfaz de los cinco modales, pero **sin escrituras reales**. No se modificaron los archivos prohibidos ni los de `figma-export/`.

## 2. Ruta real y layout existente

`src/App.jsx` monta `<Eventos />` en `/app/eventos` dentro de `ProtectedRoute` → `PrivateLayout`. Se conservan `Navbar` y `Sidebar` existentes: la pantalla no los dibuja de nuevo. `PrivateLayout.jsx` trata `/app/eventos` como sección oscura y no desplazable en el contenedor global, igual que Inicio y Mensajes; la clase `private-shell--eventos` comparte la paleta `#111713` y el scroll queda dentro de `.evt-resultados` y `.evt-detail`. Diseñado para 1366×768, 1440×900 y 1920×1080: rejilla `minmax(0,1fr)` + panel de 300–25%, con scroll interno para evitar desbordes horizontales.

## 3. Referencia visual

`figma-export/eventos-069.txt` se usó únicamente como referencia Desktop para el eyebrow «CIENCIA CIUDADANA & EXPEDICIONES», el título, la descripción y la jerarquía tarjeta/detalle. Se revisó de nuevo durante 071 para retirar los campos visuales que no existen en `Evento.java` (taxones, modalidad, GPS, mapa, equipo y roles). No se copió el bloque monolítico, no se reutilizaron `placehold.co`, conteos fijos ni datos editoriales como registros reales, y no se implementó la versión móvil.

## 4. Servicio y endpoints propuestos para 070

Archivo: `src/services/eventosService.js`, usando la instancia única de Axios de `src/services/api.js` (interceptor JWT), sin crear otro cliente.

| Operación | Ruta propuesta | Parámetros enviados hoy |
| --- | --- | --- |
| Listado | `GET /api/eventos` | `page`, `size` |
| Detalle | `GET /api/eventos/{id}` | ninguno; `signal` |
| Mis propuestas | `GET /api/eventos/mis-propuestas` | `page`, `size` |

`CONTRATO_FILTROS_CONFIRMADO = false` y `FILTROS_PROPUESTOS = ['q','estado','fechaDesde','fechaHasta']`. Mientras no se confirme el contrato, los filtros de la URL **no se envían al backend**; la UI lo advierte. En 071 se retiraron `tipo` y `modalidad` de la lista propuesta porque no existen en `Evento.java`. Cuando 070 confirme los nombres, basta activar esa constante y adaptar `eventosAdapter.js`; no hace falta cambiar el componente. El detalle por ID está preparado pero hoy no se solicita porque el listado ya trae la información necesaria.

## 5. DTO propuesto y campos reales

Las entidades reales sólo contienen `idEvento`, `proponente`, `moderador`, `titulo`, `descripcion`, `ubicacion`, `imagen`, `fechaInicio`, `fechaFin`, `cupoMaximo`, `estado`, `motivoResolucion`, `fechaResolucion`, `fechaCreacion`, `fechaActualizacion` y `participantes`. Propuesta mínima de respuesta, sin exponer entidades JPA:

```json
{"number":0,"size":10,"totalPages":2,"totalElements":12,"first":true,"last":false,
 "content":[{"idEvento":12,"titulo":"Bioblitz de polillas","descripcion":"Muestreo nocturno",
 "ubicacion":"Oaxaca","imagen":null,"fechaInicio":"2026-12-05T19:30:00",
 "fechaFin":"2026-12-07T03:00:00","cupoMaximo":30,"participantesConfirmados":24,
 "estado":"APROBADO","proponentePublico":{"nombre":"Claudia","nombreUsuario":"montes"},
 "estadoInscripcion":null}]}
```

`participantesConfirmados`, `proponentePublico`, `estadoInscripcion` y `motivoResolucion` son **propuestas de DTO**; el adaptador las acepta si llegan y las deja `null` si no. `motivoResolucion` existe en `Evento.java` y sólo se muestra en la interfaz cuando la propuesta es propia y está `RECHAZADO`. `estado` usa `PENDIENTE | APROBADO | RECHAZADO | CANCELADO` y `estadoInscripcion` usa `INSCRITO | CANCELADO` de `ParticipanteEvento`. No se inventan coordenadas GPS, mapa, equipo, etiquetas taxonómicas, tipo, modalidad ni categoría; no existen en el modelo Java. Las fechas son `LocalDateTime` sin zona: se interpretan como hora local de pared y se fija UTC sólo para formatear, evitando que el navegador desplace el día.

## 6. Paginación y orden

Se prefiere el formato Spring Page: `content`, `number`, `size`, `totalElements`, `totalPages`, `first`, `last`. El adaptador valida todos esos campos y rechaza paginaciones inválidas. El botón «Siguiente» pide `page+1` al servidor; no se crean páginas ficticias. Al cambiar pestaña, búsqueda o filtro se reinicia a `page=0`. El backend debe ordenar de forma estable (propuesta: `fechaInicio ASC, idEvento ASC`) y paginar **antes** de devolver, nunca filtrar una página ya recibida en React.

## 7. Búsqueda y filtros

La búsqueda usa `useSearchParams`, `debounce` de 350 ms y `AbortController`. Cada cambio cancela la solicitud anterior e ignora respuestas tardías. Parámetros válidos en URL: `tab`, `q`, `estado`, `periodo`, `fechaDesde`, `fechaHasta`, `page`; se validan y los valores vacíos se eliminan. «Próximos/Pasados» se traducen a `fechaDesde`/`fechaHasta` en el contrato propuesto, no se filtran en React. Los campos «Modalidad» y «Categoría / tipo» fueron eliminados en 071 porque no existen en `Evento.java`; el buscador tampoco promete búsqueda por taxón. «Limpiar filtros» restablece la URL.

## 8. Pestañas

Seis pestañas: «Todos los eventos», «Próximos 30 días», «Bioblitz y muestreos», «Talleres y simposios», «Mis participaciones» y «Mis propuestas». Navegación por teclado con `ArrowLeft/ArrowRight/Home/End`, `aria-selected`, `aria-controls` y panel con `role="tabpanel"`. Las cuatro pestañas que aún no tienen contrato muestran un aviso explícito y **no inventan resultados**; «Mis propuestas» consume la ruta propuesta `/api/eventos/mis-propuestas` y muestra `PENDIENTE`/`RECHAZADO` con sus etiquetas reales.

## 9. Tarjetas y detalle

`EventoCard.jsx` y `EventoDetalle.jsx` muestran fecha, rango, horario, ubicación, descripción, cupo y estado. Sin `imagen` se pinta un placeholder accesible «Sin fotografía disponible», nunca una foto inventada. «Cupo completo», «Finalizado» y «Inscrito» sólo aparecen cuando el servidor entrega datos que lo confirman. El detalle incluye el `proponentePublico` y, desde 071, el bloque «Motivo del rechazo» únicamente para propuestas propias rechazadas con `motivoResolucion` real; ya no muestra la nota sobre GPS/mapa/equipo/taxones. No muestra correo, tokens ni datos privados. La selección se mantiene por ID y no depende de recargar la página.

## 10. Límites con 071 y 072

En 069 «+ Proponer Evento» y «Inscribirme» sólo emitían avisos. En 071 esos avisos se sustituyeron por los cinco modales descritos en `INTEGRACION_MODALES_EVENTOS_071.md`. «Inscribirme» sigue ofreciéndose sólo en eventos `APROBADO`, con cupo confirmado por el servidor, sin inscripción activa y sin fecha pasada; no llama a `POST`, no cambia el contador ni marca «Inscrito». No hay mutaciones optimistas ni fallback a fixtures en modo API.

## 11. Estados, errores y reintento

Carga con skeletons, vacío real, sin coincidencias, error HTTP, error de red y reintento. `404` se interpreta como «servicio todavía no disponible» (caso actual hasta que exista 070); `5xx/4xx` como error HTTP; fallo sin `response` como error de red. Ningún error cae al modo demo ni muestra datos editoriales.

## 12. Modo demostración

Desactivado por defecto: `VITE_EVENTOS_MOCK=false` en `.env.example`. Con `VITE_EVENTOS_MOCK=true` se usa `src/data/eventosDemo.js`, con etiqueta visible «Vista de demostración · datos ilustrativos, no registros de MySQL». Es sólo lectura: no mezcla con MySQL, no envía peticiones, no escribe en memoria ni simula inscripciones o propuestas. Las pestañas sin contrato siguen sin mostrar resultados ficticios también en demo.

## 13. Seguridad y robustez

No se accede a MySQL desde el frontend; la autorización debe hacerse siempre en el backend con el JWT. El adaptador descarta esquemas de imagen no visuales (`javascript:`, `data:text/html`, etc.) y acepta sólo `http(s):` o rutas relativas. Se validan IDs, fechas, naturales y estado antes de pintar. Los mensajes de error son claros y no filtran detalles internos. La paginación, búsqueda y propiedades sensibles dependen del servidor, no de ocultar botones en React.

## 14. Verificación y próximos pasos con 070

Tras la 069 se ejecutaron `npm run lint`, `npm test` (19 archivos, 182 pruebas) y `npm run build`, todos correctos. Tras las correcciones de 071 se repitieron en `frontend/`: `npm run lint` correcto, `npm test` con **23 archivos y 244 pruebas** correctas, y `npm run build` correcto con la advertencia no bloqueante de chunk >500 kB. Las pruebas cubren ruta protegida, no duplicar nav, tarjetas sin imagen, detalle, pestañas, demo etiquetada, sin escrituras, filtros en URL, paginación real, abort, vacío, errores, reintento, mis propuestas, estados de cupo/inscripción, tema/scroll y los cinco modales.

Cuando 070 esté listo: confirmar rutas, nombres de parámetros, DTO, zona horaria, orden, paginación, autorización de `mis-propuestas` y significado de `estadoInscripcion`; después activar `CONTRATO_FILTROS_CONFIRMADO`, ajustar el adaptador si hiciera falta y probar manualmente 200, 400, 401, 403, 404 y 5xx con `VITE_EVENTOS_MOCK=false`. No se requiere tocar `App.jsx`, `PrivateLayout.jsx` ni los componentes visuales para ese cambio de contrato.
