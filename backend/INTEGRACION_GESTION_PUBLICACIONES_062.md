# Actividad 062 — gestión de publicaciones (contrato para 061)

## Estado inicial y alcance

060 ya implementó `GET /api/publicaciones` (feed paginado `para-ti|global`, búsqueda `q`),
`GET /api/publicaciones/{id}`, `POST /api/publicaciones` JSON, comentarios y reacciones.
061 implementó modales y servicios React, pero bloqueó la subida de imágenes. Se conservan
esos endpoints y los DTO públicos; no hay columnas para título, orden taxonómico, certeza,
ubicación o visibilidad propuesta en el diseño.

Todos los errores utilizan `ErrorResponseDTO` (`status`, `message`, `path`, `details`).
Salvo la lectura de imágenes **VISIBLES**, las rutas requieren `Authorization: Bearer <JWT>`.
El JWT se valida contra el usuario y rol vigentes de la BD; el ID del usuario nunca viene del cuerpo.

| Método y ruta | Entrada | Salida | Permisos |
| --- | --- | --- | --- |
| `POST /api/publicaciones` | JSON `{ "contenido": "..." }` (1–5000 caracteres no blancos) | 201 `PublicacionResponseDTO`, `Location: /api/publicaciones/{id}` | autenticado |
| `PUT /api/publicaciones/{id}` | JSON `{ "contenido": "..." }` | 200 `PublicacionResponseDTO` | autor o ADMINISTRADOR con `MODULO_ADMINISTRAR` |
| `DELETE /api/publicaciones/{id}` | sin cuerpo | 204 sin cuerpo | autor o ADMINISTRADOR con `MODULO_ADMINISTRAR` |
| `POST /api/publicaciones/{id}/imagen` | `multipart/form-data`, **campo `imagen`**, JPEG/PNG hasta 5 MiB | 200 `PublicacionResponseDTO` con `imagenUrl` | autor o ADMINISTRADOR autorizado |
| `DELETE /api/publicaciones/{id}/imagen` | sin cuerpo | 204 (también si no tiene imagen) | autor o ADMINISTRADOR autorizado |
| `GET /api/publicaciones/{id}/imagen` | sin cuerpo ni token | 200 bytes `image/jpeg` o `image/png`; `Cache-Control: no-store` | solo publicaciones VISIBLES con fotografía gestionada |
| `POST /api/reportes` | JSON `{ "publicacionId": 24, "motivo": "SPAM", "descripcion": "..." }` | 201 `ReporteResponseDTO`, `Location` | `PUBLICACION_REPORTAR` |
| `GET /api/reportes?page=0&size=20&estado=PENDIENTE` | estado opcional; size 1–50 | 200 `PaginaDTO<ReporteResponseDTO>` | `REPORTE_REVISAR` (MODERADOR/ADMINISTRADOR) |
| `PATCH /api/reportes/{id}/resolver` | JSON `{ "estado": "RESUELTO", "resolucion": "Revisado" }` | 200 `ReporteResponseDTO` | `REPORTE_RESOLVER` (MODERADOR/ADMINISTRADOR) |

`PublicacionResponseDTO` conserva `id`, `autor` (id, nombre, nombreUsuario, avatarUrl),
`contenido`, `imagenUrl`, `fechaPublicacion`, `estado`, `totalComentarios`,
`totalReacciones`, `reaccionUsuario`. Si hay foto, `imagenUrl` es una **ruta HTTP relativa**
`/api/publicaciones/{id}/imagen`, nunca una ruta de disco ni un identificador de archivo.
Construirla contra la URL del backend (`VITE_API_URL`) si el frontend corre en otro origen;
`<img src="http://localhost:8080/api/publicaciones/24/imagen">` funciona **sin JWT** solo
para VISIBLE. No servir imágenes OCULTAS ni ELIMINADAS; no guardar imágenes secretas en
la ruta pública. Si se necesita mostrar fotos ocultas en una UI de moderación, hace falta
otra ruta autenticada y descarga Blob mediante Axios (no está incluida aquí).

`ReporteResponseDTO` de creación: `id`, `publicacionId`, `motivo`, `descripcion`, `estado`,
`fechaReporte`; `reportanteId`, `moderadorId`, `resolucion`, `fechaResolucion` son null.
En listados/resoluciones de gestión también se incluyen los IDs de reportante y moderador,
resolución y fecha de resolución. No se serializan entidades ni datos personales.

### Integración React 061 (conectada después de implementar el backend)

1. `frontend/src/services/publicacionesService.js`: `crearPublicacion`/`actualizarPublicacion`
   envían únicamente `{contenido}`. `subirImagenPublicacion` manda `FormData` con solo
   `imagen` (sin Content-Type JSON ni boundary manual); `quitarImagenPublicacion` usa DELETE.
2. `frontend/src/components/modales/CrearPublicacionModal.jsx`: POST JSON seguido de POST
   multipart; cuando falla el segundo paso se mantiene abierto y guarda el ID para reintentar
   sin duplicar la publicación. Se actualiza el feed con el texto ya confirmado. Son dos
   transacciones independientes. `prepararFormDataPublicacion` ya no añade `contenido`.
3. `frontend/src/components/modales/EditarPublicacionModal.jsx`: PUT del texto y POST
   multipart opcional; si falla la foto reintenta sin repetir el PUT. Incluye botón de
   quitar la foto actual. `EliminarPublicacionModal` y `ReportarPublicacionModal` ya
   utilizaban las rutas previstas y se actualizaron sus avisos obsoletos.
4. `frontend/src/services/reportesService.js` conserva su contrato compatible:
   `publicacionId`, `motivo`, `descripcion`. El modal pide descripción por UX, aunque
   la API la acepta opcional.
5. `frontend/src/adapters/publicacionesAdapter.js` resuelve la ruta relativa de la imagen
   contra `VITE_API_URL` para mostrarla mediante `<img>` sin Bearer; `Inicio` recarga el feed
   tras respuestas confirmadas. **Para probarlo** se requiere `VITE_INICIO_MOCK=false`,
   `VITE_API_URL=http://localhost:8080`, backend y MySQL operativos y sesión iniciada.
   En modo demo se mantienen los botones de escritura desactivados intencionalmente.
6. El formulario de creación de Inicio (`PostComposer`) permite escribir notas y adjuntar
   foto **sin abrir el modal**; valida JPG/PNG y 5 MiB, guarda primero el texto, sube después
   el archivo y mantiene el ID para reintentar una subida fallida. El botón superior conserva
   el modal, ahora simplificado a notas e imagen. Se eliminaron los campos propuestos de
   taxonomía, certeza, ubicación y visibilidad (también del modal de edición).

### Errores, estados y dependencias

400: validación JSON, parámetros, archivo ausente/corrupto o dimensiones; 401: sin JWT en
escrituras/consultas protegidas; 403: ajeno, incluso MODERADOR ajeno (su permiso de reportes
**no** es CRUD); 404: ID inexistente o foto no pública/no existente; 409: reporte duplicado;
413: >5 MiB (multipart de Spring limitado a 6 MB para permitir respuesta 413 propia);
415: MIME/extensión/firma incompatibles; 422: regla de negocio (p. ej. editar ELIMINADA,
reportar propia/no VISIBLE, transición inválida); 500: fallo de disco/DB inesperado,
sin revelar rutas locales. La creación JSON con `imagen` no nula responde 400 (antes
se guardaba una URL arbitraria). Publicaciones anteriores con referencias no gestionadas
necesitan migración operativa de sus archivos: no se leen rutas/URLs heredadas del disco.

`VISIBLE`: aparece en feeds, admite comentarios/reacciones y foto pública. `OCULTA`:
no aparece en feeds ni admite interacciones/reporte; autor y moderación pueden consultar
su detalle (comportamiento 060), **no** su fotografía desde la ruta pública. `ELIMINADA`:
no aparece en feeds, ni en detalle público/autoral, ni admite nuevas interacciones o fotos;
su registro y claves foráneas a comentarios, reacciones y reportes permanecen. Borrado
repetido por autor/administrador autorizado: **204**. La edición preserva autor,
fecha de creación, imagen y relaciones; Hibernate actualiza `fechaActualizacion` al flush.
Solo autor o ADMINISTRADOR con `MODULO_ADMINISTRAR` editan/eliminan/suben/quitan fotos;
MODERADOR propietario sí puede gestionar su propia publicación.

Motivos admitidos: `CONTENIDO_INAPROPIADO`, `DATOS_FICTICIOS`, `SPAM`,
`IMAGEN_NO_RELACIONADA`, `LENGUAJE_OFENSIVO`, `OTRO`. Descripción opcional, máximo 500;
motivo cabe en VARCHAR(100). Se rechaza reportar la propia publicación y reportar dos
veces el mismo par reportante/publicación (409); la comprobación ocurre bajo bloqueo
pessimista de la fila de publicación durante la transacción para serializar altas
concurrentes. V7 no trae UNIQUE; no se añadió una restricción que podría invalidar
datos históricos existentes. La lista de reportes es solo para moderación. Una resolución
final acepta `PENDIENTE` o `EN_REVISION` y termina en `RESUELTO` o `RECHAZADO`, con texto
obligatorio (máx. 500), moderador y fecha; no modifica automáticamente la publicación.
No existe endpoint para iniciar `EN_REVISION` en esta versión.

### Disco y consistencia

`PUBLICACIONES_UPLOAD_DIR` define `app.storage.publicaciones.path` (por defecto
`./uploads/publicaciones`, resuelta a absoluta desde el directorio de arranque);
configurar **ruta absoluta privada y persistente**, montada fuera del repositorio y no
servida por servidor estático, en producción. `uploads/` está en `.gitignore`.
Si no existe el directorio se crea; si no puede crearse/escribirse se responde 500,
sin cambiar referencia en MySQL. Se comprueba tamaño, MIME, extensión, firma real,
decodificación completa y dimensiones (máx. 8000 por eje / 20 millones de píxeles),
se vuelve a codificar para quitar metadatos y se almacena con UUID, nunca con nombre
del cliente. MySQL conserva solo `UUID.jpg|png`. El archivo nuevo se elimina si falla
el flush o la transacción; en reemplazo/quita el viejo solo se borra **después del commit**.
La limpieza posterior al commit es best effort: si falla el borrado, el viejo puede
quedar huérfano y requiere limpieza operativa periódica; no queda una referencia a
un archivo eliminado antes del commit. Como filesystem y MySQL no tienen transacción
distribuida, un corte de proceso entre escritura/commit también requiere reconciliación
operativa. No se debe ejecutar la aplicación en múltiples nodos sin almacenamiento compartido.

### Verificación

Las pruebas de servicios usan Mockito; las de HTTP MockMvc y JWT real; las de disco
usan `@TempDir`. Ejecutar `backend/mvnw.cmd test` con **base MySQL de pruebas aislada** y
variables `DB_USER`, `DB_PASSWORD`, `DB_NAME` apropiadas para validar Flyway,
`ddl-auto=validate` y persistencia real. No ejecutar sobre una base compartida.
Sin esas variables, los tests `@SpringBootTest` de integración existentes fallan al
conectar (no constituyen prueba de persistencia MySQL). La migración V3/V7 permanece
intacta: ambas contienen las columnas, estados y claves foráneas necesarias.
