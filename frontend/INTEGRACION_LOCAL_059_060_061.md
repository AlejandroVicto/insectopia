# Integración local de Inicio (059 + 060 + 061)

Este documento describe el estado verificado en local y los pasos exactos para probarlo en el navegador. No sustituye a `backend/INTEGRACION_060.md` (contrato y validación HTTP de la actividad 060) ni a `INTEGRACION_MODALES_061.md` (componentes y su dependencia de 062).

## 1. Estado verificado

| Funcionalidad | Origen | Resultado local |
| --- | --- | --- |
| Login real `POST /api/auth/login` y JWT en solicitudes | 059 / backend | El interceptor de Axios envía `Authorization: Bearer …` a las rutas `/api/**`; el token solo vive en memoria (`AuthProvider`). |
| Feed `GET /api/publicaciones` | 060 | Paginación, `feed=para-ti|global` y búsqueda `q` funcionan con el backend real; sin datos simulados. |
| Crear publicación `POST /api/publicaciones` | 060 + 061 | El composer (texto, "Macro HD" y "Publicar") y el botón superior "+ Crear publicación" abren la misma instancia del modal Crear; tras `201` se recarga el feed y la publicación aparece. |
| Comentarios `GET|POST /api/publicaciones/{id}/comentarios` | 060 | El panel se abre solo al pulsar "Comentar", lista comentarios reales y publica nuevos con el autor del JWT. |
| Reacciones `POST|DELETE /api/publicaciones/{id}/reaccion` | 060 | El botón "Me gusta" alterna reacción, actualiza el contador y el estado por usuario sin recargar el feed. |
| Editar / Eliminar / Reportar | 061 | Modales integrados visualmente. Sus endpoints no existen aún: **dependen de la actividad 062**. Nunca se simula éxito. |
| Sugerencias, tendencias y eventos | 059 | Siguen siendo propuestas de diseño; no tienen API y se muestran vacías en modo real. |

Comprobaciones ejecutadas en `frontend/`: `npm run lint` (sin errores), `npm test` (15 archivos, 135 pruebas, 0 fallos) y `npm run build` (correcto). La validación HTTP del backend 060 quedó en `backend/INTEGRACION_060.md`: 33 PASS, 0 FAIL, 1 SKIP.

Comprobación adicional contra el backend en ejecución, sin credenciales impresas ni modificación de datos:

- `PUT /api/publicaciones/1` → HTTP 500 (sin manejador; no se modificó la publicación).
- `DELETE /api/publicaciones/1` → HTTP 500 (sin manejador; no se modificó la publicación).
- `POST /api/reportes` → HTTP 404 (sin controlador).

Por eso los tres botones de gestión permanecen visibles pero muestran el error real del backend.

## 2. Configuración local

1. Backend en marcha: `http://localhost:8080`, MySQL `insectopia_modelo_nuevo`, Flyway con 10 migraciones y `GET /api/health` → `{"status":"ok"}`.
2. En `frontend/.env` (archivo local ignorado por Git):
   ```
   VITE_API_URL=http://localhost:8080
   VITE_LOGIN_DISPONIBLE=true
   ```
   No definir `VITE_INICIO_MOCK=true`: eso activaría publicaciones ilustrativas en lugar de MySQL.
3. Si se modificó `.env`, reiniciar Vite.

Las credenciales demo se leen de `backend/src/main/java/com/insectopia/seeders/DatabaseSeeder.java` (constantes `USUARIOS_DEMO` y `CLAVE_DEMO`). Cópialas en el formulario de la app; **no las guardes en el repositorio ni en los archivos `.bru`**. Usa solo cuentas y publicaciones demo.

## 3. Pasos en el navegador

1. Abrir `http://127.0.0.1:5173` (o el puerto que indique Vite).
2. En la pantalla de login, introducir un correo demo y su clave demo desde el seeder. Pulsar "Iniciar sesión". La sesión queda en memoria; al recargar la página hay que volver a entrar.
3. En DevTools → Network, seleccionar cualquier petición a `/api/publicaciones` y comprobar en "Request Headers" que existe `Authorization: Bearer …`. No copiar ni compartir el token completo.
4. **Feed**: ver publicaciones reales, sin etiqueta "Vista de demostración".
5. **Búsqueda**: escribir un texto en el buscador del encabezado; la URL queda con `?q=…` y el feed vuelve a la página 1.
6. **Paginación**: pulsar "Siguiente"/"Anterior"; la URL queda con `?page=…` y el feed se desplaza arriba.
7. **Vistas**: pulsar "Para ti" / "Global"; la URL queda con `?feed=…` y se reinicia la página.
8. **Crear**: pulsar "Publicar", el texto del composer, "Macro HD" o "+ Crear publicación" en el encabezado. Escribir al menos 10 caracteres en "Notas de campo y morfología" y pulsar "Publicar hallazgo". El diálogo se cierra y la nueva publicación aparece en el feed. Los campos de orden, certeza, ubicación y visibilidad están deshabilitados: son propuestas de diseño. Si se selecciona una imagen JPG/PNG aparece la vista previa y los botones "Sustituir imagen" y "Quitar imagen"; el envío se bloquea con un aviso: adjuntar archivos al envío aún no está disponible.
9. **Comentarios**: pulsar "Comentar" en una tarjeta. Se lista el contenido real; escribir un comentario y pulsar "Enviar comentario". El contador de la tarjeta aumenta solo tras la respuesta del backend.
10. **Reacciones**: pulsar "Me gusta". El corazón queda marcado y el contador sube; pulsar de nuevo lo quita. Si hay dos usuarios demo abiertos, cada uno ve su propio estado.
11. **Editar/Eliminar/Reportar**: pulsar "···" en una tarjeta. El menú y los diálogos indican que estas acciones aún no están disponibles. Editar y Eliminar aparecen para el autor o administrador; Reportar para los demás. Al enviar cualquiera de ellos se muestra el error real (500/404) y el diálogo permanece abierto: no se marca éxito ni se elimina nada.
12. **Cerrar modales**: Escape, clic en "Cancelar"/"×" o clic fuera del diálogo. El foco vuelve al botón que lo abrió.

## 4. Errores encontrados y correcciones

- `VITE_LOGIN_DISPONIBLE` no estaba definido en `.env`, por lo que el formulario de login aparecía deshabilitado con un mensaje de "actividad 054". Se añadió `VITE_LOGIN_DISPONIBLE=true` al `.env` local (ignorado por Git).
- El composer y las acciones de las tarjetas estaban deshabilitados porque 061 se entregó sin integrar. Se conectaron a los modales y a los servicios reales de 060, manteniendo el modo demo intacto.
- El botón superior "+ Crear publicación" estaba deshabilitado y no compartía estado con el composer. Ahora ambos usan un único modal vía `CrearPublicacionProvider`; desde otra sección se vuelve al inicio antes de abrirlo, y solo se recarga el feed tras un `201` confirmado.
- Se retiró el aviso técnico de Inicio que mencionaba las actividades 060/062. Los mensajes de "aún no disponible" quedan en el menú y en los modales correspondientes.
- La selección de imagen ahora permite sustituirla y quitarla, y construye un `FormData` local (`prepararFormDataPublicacion`) sin enviarlo; el envío con foto sigue bloqueado.
- `react-hooks/set-state-in-effect` detectó dos `setState` síncronos en efectos (panel de comentarios y reinicio de overrides del feed). Se sustituyeron por estado inicial y por estado versionado con la clave del feed; lint quedó limpio.
- Una prueba de integración capturaba la llamada `POST` antes de que ocurriera. Se cambió la aserción para esperar a que la petición apareciera; las 135 pruebas pasan.
- No se encontraron DTOs de edición, borrado ni reporte en el backend: se dejó la dependencia de 062 explícita en la UI y en la documentación, sin simular operaciones.

## 5. Límites conocidos

- La carga de imágenes no se envía: `Publicacion` solo acepta `imagen` como cadena y no existe endpoint de upload.
- "Compartir" y "Macro HD" abren el modal Crear; "Ubicación" sigue deshabilitada: no hay contrato de backend para ubicación.
- El panel de comentarios no tiene editar/eliminar: el backend 060 solo expone listado y creación.
- No se creó otra base de datos, no se modificaron migraciones ni entidades y no se alteraron registros de usuarios reales. Las únicas pruebas HTTP con escritura usaron cuentas demo.
