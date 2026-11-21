# Modales de publicaciones (actividad 061)

Componentes de la actividad 061, ahora integrados en `Inicio.jsx` junto con el feed de la actividad 059 y el backend de la actividad 060. Los archivos internos de los modales no se modificaron; la integración se hizo en la página y en los componentes de Inicio, conservando sus estilos y estructura. No se agregó ninguna ruta ni vista de demostración.

## Componentes

Ubicación: `src/components/modales/`.

| Componente | Props |
| --- | --- |
| `CrearPublicacionModal` | `open`, `onClose`, `onSuccess(data)` |
| `EditarPublicacionModal` | `open`, `publicacion`, `puedeEditar`, `onClose`, `onSuccess(data, publicacion)` |
| `EliminarPublicacionModal` | `open`, `publicacion`, `onClose`, `onSuccess(publicacion)` |
| `ReportarPublicacionModal` | `open`, `publicacion`, `onClose`, `onSuccess(data, publicacion)` |

Todos devuelven `null` cuando `open` es `false`, renderizan un portal con `role="dialog"` / `aria-modal="true"`, atrapan el foco, restauran el foco al cerrar, cierran con Escape (salvo durante una operación en curso) y permiten clic en el fondo para cancelar. El contenido se desplaza dentro del diálogo (`max-w-[672px]`, `max-h-[min(90dvh,736px)]`).

Integración implementada en `Inicio.jsx`: estado `modal` (`null | 'editar' | 'eliminar' | 'reportar'`) y estado `seleccionada`; el modal Crear se rige por `CrearPublicacionProvider` (`src/context/`) y se monta una sola vez en Inicio. `onSuccess={recargar}` reinicia filtros, vuelve a la página 0 e incrementa `retry` para volver a pedir el feed. Los callbacks solo se ejecutan después de una respuesta exitosa confirmada por la API; los errores dejan el diálogo abierto y muestran el mensaje real. Los modales se renderizan condicionalmente para que se desmonten al cerrarse y vuelvan a iniciar limpios.

`PostComposer` abre el mismo modal Crear desde el texto, desde "Macro HD" y desde "Publicar" solo en modo API real; en modo demo permanece deshabilitado. El botón superior "+ Crear publicación" del `Navbar` usa el mismo estado compartido y, si se pulsa desde otra sección, vuelve al inicio antes de mostrar el diálogo. `PublicationCard` abre el menú de acciones solo en modo API real: Editar y Eliminar para el autor o un administrador, Reportar para otros usuarios. El menú y los tres diálogos avisan de que esas operaciones aún no están disponibles en el backend.

## Contrato comprobado en el backend

- Existen las entidades `Publicacion` (V3) y `Reporte` (V7) y sus repositorios.
- `Publicacion` solo tiene `contenido`, `imagen` (cadena), `estado` y fechas. No tiene orden taxonómico, certeza, ubicación ni visibilidad.
- `Reporte` tiene `motivo`, `descripcion`, `reportante` y `publicacion`.
- `ErrorResponseDTO` responde `{ message, details: [{ field, message }], status, path }`; el interceptor de Axios aporta `userMessage` para 403 y fallos de red.
- La actividad 060 ya implementó `PublicacionesController`, `ComentariosController` y `ReaccionesController`. El contrato real confirmado es:

| Operación | Ruta | Estado |
| --- | --- | --- |
| Listar / buscar / paginar | `GET /api/publicaciones` | Implementada en 060 |
| Crear | `POST /api/publicaciones` con `{ contenido, imagen? }` | Implementada en 060 |
| Comentarios | `GET|POST /api/publicaciones/{id}/comentarios` | Implementada en 060 |
| Reacciones | `GET|POST|DELETE /api/publicaciones/{id}/reaccion` | Implementada en 060 |
| Editar | `PUT /api/publicaciones/{id}` | **Pendiente de 062** |
| Eliminar | `DELETE /api/publicaciones/{id}` | **Pendiente de 062** |
| Reportar | `POST /api/reportes` | **Pendiente de 062** |

Las rutas están centralizadas en `src/services/publicacionesService.js`, `src/services/comentariosService.js`, `src/services/reaccionesService.js` y `src/services/reportesService.js`. No hay simulación ni persistencia local: si el endpoint falta, el modal muestra el error real (por ejemplo 405/404/403 o fallo de red). Los tres botones dependientes de 062 se abren y permiten interactuar, pero nunca marcan éxito sin confirmación del backend.

## Decisiones de diseño

- Los campos de Figma no admitidos por el modelo se muestran deshabilitados y etiquetados como propuestas; nunca se envían.
- La selección de imagen valida JPG/PNG y 5 MB y genera una vista previa real con `URL.createObjectURL`. Hay controles explícitos para sustituir y quitar el archivo (este último libera la URL y habilita el envío). `prepararFormDataPublicacion` construye un `FormData` con `contenido` e `imagen` para acordar el contrato multipart, pero no se envía: el endpoint actual solo acepta `imagen` como cadena. El envío se bloquea mientras haya un archivo seleccionado. No se promete soporte RAW ni EXIF.
- `motivo` envía códigos estables (`SPAM`, `CONTENIDO_INAPROPIADO`, …) definidos en `src/constants/modalesPublicaciones.js`; las etiquetas son solo presentación.
- `puedeEditar` debe ser calculado por la página que integra el modal según el usuario autenticado y las reglas de autorización del backend.

## Verificación

`npm run lint`, `npm test` y `npm run build` se ejecutan en `frontend/` (135 pruebas, 0 fallos). Las pruebas usan el adaptador de Axios; no contactan al backend ni crean datos. Además de las pruebas unitarias de los modales (vista previa, sustitución/eliminación, bloqueo y `FormData`), `src/pages/InicioIntegracion.test.jsx` comprueba ambos accesos al modal, creación con recarga del feed desde el composer y desde el botón superior, reacciones, comentarios y el error real de una operación aún no disponible.
