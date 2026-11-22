# Integración de Mi perfil (073) y modales (075)

## Estado y referencias

- Ruta: `/app/perfil` dentro de `PrivateLayout`; se conservan `Navbar`, `Sidebar` y el proveedor de sesión. «Editar perfil» navega a `/app/configuracion?seccion=perfil` (077); no se implementó ningún formulario de edición.
- Referencias Figma: perfil `2:509`, seguidores `111:687`, seguidos `111:881`, fila `111:680`, estados `113:758`. Edición `2:653` se utilizó exclusivamente como contexto. El acceso directo a Figma devolvió **HTTP 403** desde este entorno; se utilizó el código visual de referencia incluido en la solicitud, adaptado a los tokens verdes vigentes de Inicio (en vez de pegar una captura).
- `MiPerfil`, `PerfilUsuariosModal`, `PerfilUsuarioRow`, `ConfirmarDejarSeguir`, `adaptarPerfil`, `perfilService` y estilos encapsulados de perfil. Se reutilizan `Avatar`, el contrato paginado y adaptadores de Mensajes, el catálogo de países, Axios JWT y las clases/tokens visuales de Inicio. El componente `PublicationCard` está disponible para integrarlo cuando exista la consulta correcta de publicaciones propias.

## Contratos comprobados en el backend local

| Contrato | Estado | Uso |
| --- | --- | --- |
| `GET /api/usuarios/seguidos?page=0&size=20&q=...` | Existe (`SeguidosController`, `PaginaDTO<SeguidoResponseDTO>`, máximo 50). | Modal de seguidos: búsqueda en servidor, total, páginas, carga adicional, deduplicación, abortos, vacío/error/reintento. Se consulta también con `size=1` para el total en el panel. El DTO solo se presenta mediante nombre, alias y avatar. No se altera el servicio de Mensajes. |
| `GET /api/auth/me` | Existe (`AuthResponseDTO.UserDTO`): `id`, `name`, `nombreUsuario`, `avatarUrl`, `role`, `email`. | **Únicamente** identidad parcial tras 404 de `/api/usuarios/me`. Se ignoran `role`/`email` en el adaptador de perfil. Aviso explícito de integración incompleta. No devuelve biografía, ubicación, fecha ni estadísticas. |
| `GET /api/catalogos/paises` | Existe (`Pais {codigo,nombre}`). | Resuelve el código de país a nombre cuando el perfil privado lo entrega; ante fallo se muestra el código real, no un país inventado. |
| `GET /api/publicaciones` | Existe, pero solo recibe `feed` (`para-ti`/`global`), `page`, `size`, `q`. | **No se utiliza** para «Mis Publicaciones»: filtrar localmente una página del feed sería incorrecto. |

## Contratos pendientes del backend (NO integrados)

- **074**: `GET /api/usuarios/me` (no existe controlador local). Se espera DTO privado de la cuenta autenticada: identificador, `nombre`, `nombreUsuario`, `fotoPerfil`, `biografia`, `paisCodigo`, `estadoRegion`, `fechaRegistro` y, si se acuerda, contadores comprobados (`totalSeguidores`, `totalSeguidos`, `totalPublicaciones`). El frontend consulta la ruta acordada y, ante 404, usa solo identidad de `/api/auth/me` con aviso. Otros errores generan estado de error y reintento. Confirmar el DTO definitivo antes de activar contadores adicionales.
- **074**: se propone `GET /api/usuarios/me/publicaciones?page=0&size=10` → `PaginaDTO<PublicacionResponseDTO>` con autor autenticado impuesto en servidor, orden estable y total. Sin este contrato no es posible mostrar publicaciones propias, su paginación ni su contador con garantía; aparece un estado de indisponibilidad, no contenido demo. Cuando exista, reutilizar `adaptarPaginaPublicaciones`/`PublicationCard` y habilitar carga adicional por ID sin duplicados y cancelación.
- **076**: se propone `GET /api/usuarios/me/seguidores?page=0&size=20&q=...` → `PaginaDTO` de DTO público (`id`, `nombre`, `nombreUsuario`, `avatarUrl`, `loSigo` confirmado). No existe controlador en el backend local: el modal compartido muestra claramente «Lista de seguidores no disponible», sin copiar la lista de seguidos. Búsqueda y paginación de seguidores quedan pendientes.
- **076**: seguir/dejar de seguir: rutas **propuestas, no invocadas** `POST /api/usuarios/{id}/seguir` y `DELETE /api/usuarios/{id}/seguir` (204), con autorización sobre el usuario autenticado, prohibición de autosseguimiento y respuesta confirmada para estado/contadores. No existe endpoint HTTP local para estas operaciones. Los botones de las filas están deshabilitados y etiquetados como no disponibles: no se envían solicitudes ni se simula éxito. `ConfirmarDejarSeguir` conserva el diseño de confirmación para conectarlo a DELETE cuando haya contrato real; no se abre como si ya funcionara.

## Comportamiento y límites

- Pantalla: tarjeta de avatar (imagen o iniciales si falta/falla), nombre y `@alias`, ubicación autorizada (solo país/región), biografía o estado vacío, panel derecho de contadores (guion si faltan), fecha formateada y sección de publicaciones sin falsos positivos. La falta del endpoint privado **impide declarar 073 completa**.
- Modales: la estructura de Seguidores y Seguidos es única; Seguidos cuenta con debounce de búsqueda, skeleton, vacío, sin coincidencias, error, reintento y paginación servidor. La lista conserva páginas anteriores si falla cargar más. No aparecen correo, teléfono ni datos privados en las filas. Seguidores y acciones requieren 076: **075 no está completamente integrada**.
- Accesibilidad: botones y etiquetas, `role=dialog`, `aria-modal`, región con scroll, foco atrapado con Tab, Escape/cierre, restauración del foco e inercia de `#root` durante el diálogo; estados accesibles. No se usan `alert`/`confirm` de ventana. Consultas canceladas al cambiar búsqueda, cerrar modal, abandonar la ruta o cerrar sesión; `PrivateLayout` remonta su contenido al cambiar el token.
- Responsividad: mantiene panel central y lateral en escritorio; a menor ancho apila estadísticas, limita el ancho/alto del modal y adapta solo el shell de perfil, sin cambiar los mínimos de ancho de Inicio, Mensajes o Notificaciones.

## Validación

Las pruebas de `MiPerfil.test.jsx` cubren ruta/layout, identidad real/parcial, privacidad, navegación, avatar, biografía, ubicación, total, listas diferentes, búsqueda, paginación/deduplicación, error/reintento, vacío, cierre/foco y limpieza de sesión; la confirmación preparada se prueba por separado. Las pruebas de regresión del resto del proyecto se ejecutan con el conjunto completo. Los resultados finales se informan en la respuesta de entrega. No se modificó backend ni base de datos, y no se hicieron commits.
