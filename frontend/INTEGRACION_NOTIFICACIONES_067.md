# Actividad 067 — Notificaciones (React)

> Actualización 063–068: los párrafos históricos más abajo que indican «no marca al abrir publicación» o «mensajes pendientes de backend» quedan reemplazados por el contrato definitivo al final de este documento.

## Implementación y referencias

| Referencia Figma | Implementación |
| --- | --- |
| `88:749` — **Notificaciones** | Ruta `/app/notificaciones` dentro de `PrivateLayout`, con **Navbar** y **Sidebar** originales, encabezado y contador, filtros, actividad reciente, tarjetas, paginación y panel derecho basado solo en la sesión real. Colores y tipografías Mulish / Plus Jakarta Sans coherentes con Inicio. |
| `90:715` — **Estados** | Modal de marcado masivo con foco atrapado y Escape mediante `ModalContainer`, recurso no disponible en la fila, vacío (también por filtro), skeletons y error con reintento. |
| `90:647` — **Fila reutilizable** | `NotificacionCard`: icono según tipo, actor público si existe, contenido, fecha española, indicador y texto leído/no leído, acción individual, eliminación discreta, errores por fila. Cada registro usa el mismo componente; ninguna fila es ficticia. |

Archivos nuevos: `src/pages/{Notificaciones,PublicacionDetalle}.jsx`, `src/pages/notificaciones.css`, `src/components/notificaciones/{NotificacionCard,NotificacionesEstados,ConfirmarNotificacionModal}.jsx`, `src/components/notificaciones/fechaNotificacion.js`, `src/services/notificacionesService.js`, `src/context/{NotificacionesContext.js,useNotificaciones.js,NotificacionesProvider.jsx}`, pruebas `src/pages/{Notificaciones,PublicacionDetalle}.test.jsx` y `src/components/notificaciones/NotificacionCard.test.jsx`.

Archivos ajustados: `src/App.jsx`, `src/layout/{PrivateLayout.jsx,Sidebar.jsx,private-layout.css}`, `src/services/publicacionesService.js` y fixtures de pruebas de layout, Inicio y Mensajes para aislar sus adaptadores de red del nuevo contador global. No se cambió código funcional de Inicio ni de Mensajes, ni modales de publicaciones, ni backend.

## API y sincronización

Todas las peticiones pasan por el cliente Axios compartido `services/api.js`, que adjunta el JWT de `AuthProvider`, maneja 401 y nunca recibe un ID de destinatario:

- `GET /api/notificaciones?page=0&size=10&filtro=todas|no-leidas|leidas` → `content`, `number`, `size`, `totalElements`, `totalPages`, `first`, `last`.
- `GET /api/notificaciones/no-leidas/count` → `{ "count": 2 }`.
- `PATCH /api/notificaciones/{id}/leer` → objeto actualizado con `leida: true`.
- `PATCH /api/notificaciones/leer-todas` → `{ "count": 0 }`.
- `DELETE /api/notificaciones/{id}` → 204 sin cuerpo.

`NotificacionesProvider` se monta en el layout privado **por token de sesión** y es la única fuente del contador para Navbar, Sidebar e insignia de página. Solicita el contador al entrar, al recuperar foco/visibilidad y cada 45 s mientras la pestaña está visible. Cancela solicitudes antiguas y evita que una respuesta anterior sobrescriba otra posterior. No muestra un cero inventado mientras espera o si falla el contador. Al salir o cambiar cuenta se desmonta el provider y se descartan datos anteriores. En Notificaciones se actualiza de nuevo al entrar y tras acciones exitosas.

La página solicita el listado al cambiar filtro, página o reintentar; también lo refresca si cambia el contador del sondeo global. Reinicia a página cero al filtrar; usa `AbortController` y clave de parámetros para ignorar respuestas antiguas. Muestra skeleton durante cada cambio, no filas de otro filtro. Obtiene el total y las opciones de paginación del backend. Si la última fila de la última página desaparece, vuelve a la última página disponible. El contador de «No leídas» proviene del endpoint de conteo; el total de «Todas» solo se muestra cuando la respuesta de ese filtro lo confirma.

**Marcado individual:** deshabilita la fila mientras espera; solo tras PATCH 200 con `id`/`leida` confirmados recarga listado y contador. Un fallo mantiene el aviso sin leer y muestra error accesible junto al botón para reintentar.

**Marcado masivo:** el modal de Figma permite cancelar sin peticiones, restaura el foco y bloquea Escape/cierre mientras se procesa. Tras PATCH confirmado cierra y consulta de nuevo contador y listado; un error conserva el modal y permite reintentar. Se deshabilita cuando el contador es cero o aún no está disponible.

**Eliminar:** control secundario `×` con nombre accesible, modal de confirmación, espera 204 y luego recarga. Un error no elimina visualmente la fila. No hay navegación ni eliminación al pulsar la tarjeta.

**Navegación a publicaciones (mejora 067):** las filas `COMENTARIO` y `REACCION` muestran el enlace semántico «Ver publicación» solo cuando `recurso.tipo === PUBLICACION`, `disponible === true`, el ID es entero seguro positivo y `apiUrl` coincide exactamente con `/api/publicaciones/{id}`. **Nunca se navega a `apiUrl`** ni a direcciones arbitrarias. El enlace abre la ruta protegida React `/app/publicaciones/:id`. `PublicacionDetalle` valida el parámetro y consulta `GET /api/publicaciones/{id}` mediante `consultarPublicacion` y el Axios/JWT compartido; no consulta el feed, no depende de «Para ti» ni de su página actual, y comprueba que el ID recibido coincida. Reutiliza `adaptarPublicacion`, `PublicationCard`, sus acciones de reacción y `ComentariosPanel` (visible de inicio, con GET real de comentarios), y los modales existentes de gestionar la publicación. Incluye enlace «Volver a Notificaciones». Abrirla **no** marca la notificación como leída. Una URL directa abre el mismo ID tras autenticar: al recargar, la sesión solo en memoria redirige a login y `ProtectedRoute`/`Login` restauran esa ruta tras iniciar sesión.

**Recursos eliminados o inaccesibles:** si `disponible` es falso, la notificación permanece visible sin enlace y se puede marcar como leída; los reportes carecen de vista individual para el reportante. Si la publicación pierde acceso después de presentar el enlace, el GET de detalle devuelve 403/404 y muestra «Contenido no disponible» con retorno a Notificaciones, sin mostrar datos antiguos ni redirigir en bucle. ID inválido o eliminado tampoco presenta contenido; errores de red/servidor muestran reintento. Un 401 sigue el flujo de sesión del interceptor compartido.

**Mensajes (pendiente de backend):** el contrato 068 de los avisos legados `NUEVO_MENSAJE` solo devuelve `recurso.tipo: MENSAJE` con `id: null` y sin `apiUrl`; **no incluye `conversacionId`**. El backend de este repositorio no tiene controladores para `/api/conversaciones` ni para consultar el historial, aunque existen clientes frontend propuestos. El ID de un mensaje nunca equivale al de su conversación. Por seguridad no hay enlace «Ir a conversación», selección automática ni datos demo en el flujo real. Para implementarlo se requiere que el backend genere el aviso dentro de la transacción de envío y entregue un **ID de conversación explícito**, verificable para el destinatario, y endpoints autorizados para obtener esa conversación por ID (incluso fuera de la primera página/búsqueda actual) y su historial; opcionalmente `mensajeId` para localizar el mensaje. Entonces `Mensajes` podrá aceptar `/app/mensajes?conversacion={id}`, verificar acceso con el backend y seleccionar **solo** ese chat. Hasta entonces la navegación a mensajes **no está terminada**.

Se presentan los tipos reales `COMENTARIO`, `REACCION`, `REPORTE_RESUELTO`, `REPORTE_RECHAZADO`. Las variantes legadas `NUEVO_SEGUIDOR`, `NUEVA_PUBLICACION`, `NUEVO_MENSAJE`, `EVENTO_APROBADO`, `EVENTO_RECHAZADO` solo tienen representación visual si llegan del backend (no se generan aquí). Los tipos desconocidos muestran «Nueva actividad» y su contenido de forma segura. La generación de avisos de seguidores, mensajes y eventos depende de los módulos del backend pendientes.

## Verificación

Desde `frontend/`: `npm run lint`, `npm run build`, `npm test`. Las pruebas de `Notificaciones.test.jsx` usan un adaptador Axios controlado para verificar filtros, paginación, JWT, contadores compartidos, acciones, errores, cancelación, sesión y respuestas obsoletas. `NotificacionCard.test.jsx` cubre sus variantes y enlaces seguros. `PublicacionDetalle.test.jsx` comprueba URL directa/retorno desde login, consulta del ID exacto con JWT, imagen, comentarios, reacciones, 403/404 y reintento. Los tests de Inicio y Mensajes aíslan únicamente el contador global para conservar sus expectativas de red originales. Resultado local: **lint correcto, build correcto y 188/188 pruebas aprobadas en 19 archivos** (cero fallos). La suite usa **mocks de red**, no una prueba HTTP real con dos usuarios.

### Prueba funcional manual con dos usuarios (entorno de pruebas, no producción)

1. Iniciar backend con esquema aislado `insectopia_test`, sin datos compartidos ni perfil `demo`. Configurar `VITE_API_URL` para el backend.
2. Iniciar sesión como **A** y crear publicación; iniciar sesión como **B** en otro navegador y comentarla o reaccionar.
3. Volver como A; al enfocar la pestaña comprobar que Navbar, Sidebar e insignia muestran el mismo contador y que `/app/notificaciones` contiene el aviso. Cambiar filtros y páginas. Abrir «Ver publicación»: comprobar que llega al ID exacto, incluye comentarios y reacciones y funciona con URL directa tras login; regresar con «Volver a Notificaciones».
4. Marcar una leída, recargar, confirmar su persistencia y probar el modal «Marcar todas» (cancelar primero, luego confirmar).
5. Eliminar una notificación de prueba y confirmar que listado/contador cambian solo tras la respuesta. Si la publicación está eliminada, comprobar aviso histórico sin enlace.

La suite de frontend usa **mocks de red**: por sí sola no demuestra una comprobación HTTP real con dos usuarios. Anotar aquí el resultado de esa comprobación solo cuando se ejecute realmente.

## Integración definitiva de navegación y lectura

La página no marca avisos al entrar. `NotificacionCard` conserva sus enlaces existentes a publicaciones y ofrece «Ir a conversación» solo para avisos `MENSAJE` (o `NUEVO_MENSAJE` con FK) con `recurso.id` del mensaje, `recurso.conversacionId` entero positivo y `apiUrl=/api/conversaciones/{conversacionId}`. El área navegable y el enlace comparten una única operación: si está sin leer, esperan `PATCH /api/notificaciones/{id}/leer`, validan `id` y `leida:true`, actualizan listado/contador mediante `NotificacionesProvider.refreshCount` y navegan; si falla el PATCH, no simulan lectura y aun así navegan. Dos pulsaciones no duplican el PATCH. «Marcar leída» no navega; «Marcar todas» permanece independiente. Comentarios y reacciones siguen abriendo `/app/publicaciones/{id}`.

Para mensajes, la ruta destino es `/app/mensajes?conversacion={conversacionId}`. `Mensajes.jsx` consulta `GET /api/conversaciones/{id}` (autorizado) antes de seleccionar, incluso si el chat no figura en la primera página; luego carga `GET /api/conversaciones/{id}/mensajes`. ID inválido, 403 o 404 no seleccionan otro chat. Solo después de cargar el historial en pestaña visible registra el último mensaje recibido visible mediante `PATCH /api/conversaciones/{id}/lectura` y confirma `noLeidos` desde el backend; refresca la bandeja y el filtro de no leídos. La lectura del aviso y la del chat no se sincronizan automáticamente entre sí.

Pruebas de frontend con adaptador HTTP controlado: enlace y área navegable, comentarios/reacciones, aviso de mensaje, chat fuera de página inicial, contador, fallo de PATCH, pestaña oculta, persistencia simulada al remontar y 403/404. La prueba manual con `alex@gmail.com` y `alex2@gmail.com` **no se ejecutó**; estas pruebas no sustituyen esa comprobación real.

Verificación actual: `npm run lint` y `npm run build` correctos; `npm test -- --maxWorkers=2`: **194/194 pruebas**, 19 archivos. La primera ejecución simultánea a Maven con el paralelismo por defecto tuvo tres fallos por tiempo de espera; la repetición completa con dos workers pasó.
