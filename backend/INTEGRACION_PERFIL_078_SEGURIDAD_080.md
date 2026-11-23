# Integración 078 — Perfil y 080 — Seguridad

## Contratos HTTP

| Método | Ruta | Entrada | Respuesta |
| --- | --- | --- | --- |
| GET | `/api/usuarios/me` | JWT | `MiPerfilResponseDTO` original, sin cambios |
| GET | `/api/usuarios/me/configuracion` | JWT | `ConfiguracionPerfilResponseDTO` (idUsuario, nombre, nombreUsuario, biografia, genero, paisCodigo, estadoRegion, fechaNacimiento, telefono, correo, fotoPerfil) |
| PUT | `/api/usuarios/me` | JWT + `ActualizarPerfilRequestDTO` JSON | 200 + `ConfiguracionPerfilResponseDTO` persistido |
| POST | `/api/usuarios/me/avatar` | JWT + multipart `imagen` | 200 + `ConfiguracionPerfilResponseDTO` |
| DELETE | `/api/usuarios/me/avatar` | JWT | 204 |
| GET | `/api/usuarios/{id}/avatar` | Público, sin Bearer | 200 JPEG/PNG (sin caché), o 404 |
| PUT | `/api/usuarios/me/contrasena` | JWT + `CambiarContrasenaRequest` JSON | 200 + `CambiarContrasenaResponseDTO` |

`ActualizarPerfilRequestDTO` admite **solo** `nombre`, `nombreUsuario`, `biografia`, `genero`, `paisCodigo`, `estadoRegion`, `fechaNacimiento`, `telefono`. Es una sustitución completa de esos campos: consultar configuración antes de guardar. `nombre`, `nombreUsuario`, país, región y fecha de nacimiento son obligatorios. Nombre Unicode y espacios (máximo 100); username de 3–30 `[a-z0-9._]`, recortado y en minúsculas; biografía hasta 500; género igual al registro (o nulo); teléfono opcional hasta 20, 7–15 dígitos, con formato del registro. País normalizado a mayúsculas, región validada por catálogo verificado (se respeta caché y 503). La fecha es real y no futura.

Los campos desconocidos (por ejemplo `idUsuario`, `rol`, `correo`, `contrasena`, `estado`, `versionToken`, `fotoPerfil`, `fotoPortada` y preferencias) se rechazan con 400; no hay asignación masiva a entidades. El selector de la cuenta es exclusivamente el principal JWT. El correo solo se lee; cambiarlo requiere un flujo separado.

`CambiarContrasenaRequest`: `{ "contrasenaActual": "Actual123!", "contrasenaNueva": "Nueva456!" }`. La confirmación se valida en la interfaz y no se envía. Respuesta: `{ "mensaje": "Contraseña actualizada correctamente.", "requiereReautenticacion": true }`; no se emite JWT. BCrypt verifica la actual y almacena solo el hash de la nueva; debe tener al menos 8 caracteres, mayúscula, número y símbolo, y diferir de la actual. En una transacción se bloquea primero el usuario, se cambia el hash, se incrementa `versionToken` una vez y se invalidan los enlaces pendientes de recuperación. La emisión de nuevos enlaces bloquea también primero al usuario. El filtro JWT rechaza las sesiones anteriores; el frontend borra la sesión al confirmar la salida del modal. Cinco contraseñas actuales incorrectas en 15 minutos por cuenta provocan un enfriamiento temporal en memoria por instancia (sin alterar el login); en despliegue con múltiples réplicas se requiere un limitador compartido.

## Respuestas de error

Se mantiene `ErrorResponseDTO` (timestamp, status, error, message, path y `details` cuando corresponda). Ejemplos mínimos:

```json
{ "message": "Los datos enviados no son válidos", "details": [{ "field": "contrasenaActual", "message": "La contraseña actual no es correcta." }] }
```

```json
{ "message": "El recurso ya existe", "details": [{ "field": "nombreUsuario", "message": "Este nombre de usuario ya está en uso." }] }
```

401 sin JWT/vencido/revocado; 400 validación o JSON desconocido; 409 username ocupado, incluso por carrera de clave única MySQL; 503 catálogo no disponible; 404 avatar no existente o usuario no activo; 413 foto > 5 MB; 415 formato MIME/firma incompatible. Fallos de persistencia causan rollback (5xx); no se registran secretos.

## Archivos y despliegue

El almacenamiento de avatar usa la validación de JPEG/PNG del servicio de imágenes: MIME, extensión segura, firma, decodificación, dimensiones y reescritura sin metadatos. El archivo tiene UUID generado en servidor. `foto_perfil` almacena una URL HTTP(S) pública del propio backend con versión UUID; las URLs legacy ya almacenadas siguen siendo legibles en DTOs, pero solo las fotos nuevas locales se sirven/limpian por este endpoint. Para imágenes locales reemplazadas o quitadas, y al eliminar administrativamente su cuenta, se registra la limpieza en la cola durable transaccional `limpieza_archivos_pendientes`: nunca se borra antes del commit. La referencia debe coincidir exactamente con el origen configurado y el id del propietario; no se borran URLs externas, avatares de otras cuentas ni archivos de publicaciones o eventos. La cola comprueba además que el avatar no siga referenciado en la BD antes de eliminarlo.

Para la fotografía **nueva** se crea una marca `UUID.jpg|png.pendiente` en el directorio de avatares **antes** de escribir el archivo. En commit se quita solo la marca; en rollback se intenta borrar foto y marca. Si falla el borrado, la marca persiste incluso si la BD estaba indisponible; el mismo trabajo programado de limpieza reintenta marcas con más de **24 horas** de antigüedad, comprobando primero las referencias de la BD. Si el avatar está referenciado, retira la marca sin tocar la imagen. Si falla la consulta a BD o la eliminación, conserva la marca para otro ciclo; requiere directorio persistente y que la BD/almacenamiento vuelvan a estar disponibles. El GET solo sirve archivos de usuarios activos y únicamente referencias que correspondan al id y a la URL base configurada; no interpreta rutas externas ni traversal.

Variables en `.env.example`: `AVATARES_UPLOAD_DIR` (directorio persistente; por defecto `./uploads/avatares`) y `APP_API_PUBLIC_URL` (origen HTTP(S) estable, por defecto `http://localhost:8080`). En VPS establecer una ruta absoluta fuera del artefacto, con permisos de escritura, volumen/backup persistente y URL pública HTTPS estable; cambiar el origen tras guardar fotos requiere migrar las URLs existentes en `foto_perfil`. No se modifica la tabla `usuarios` ni se agrega migración Flyway.

## Verificación manual

1. Entrar con un usuario de prueba y abrir Configuración: comprobar valores completos, fecha, teléfono y correo de solo lectura.
2. Editar nombre/bio/ubicación, guardar y recargar Configuración y Mi Perfil; intentar un nombre de usuario ocupado y una región ajena.
3. Seleccionar JPEG/PNG, guardar y recargar; reemplazar, quitar y recargar; probar archivo corrupto y archivo mayor de 5 MB. Verificar avatar en Navbar y `<img>` público sin Bearer.
4. Cambiar contraseña con actual errónea, nueva débil y nueva válida; confirmar salida, probar token anterior, entrar con contraseña anterior (debe fallar) y con la nueva (debe funcionar). Comprobar que un enlace de recuperación emitido antes del cambio ya no sirve.
5. Verificar que la cola de limpieza borra fotografías anteriores tras commit y que un fallo de persistencia revierte la referencia.

## Pruebas

Antes de estos ajustes: compilación Maven, 35 pruebas backend dirigidas, 48 frontend, ESLint y build Vite correctos (aviso Vite por tamaño de bundle). En esta iteración: `mvnw.cmd -q '-Dtest=AdminEliminacionAvatarTests,LimpiezaArchivosCuentaServiceTests,ConfiguracionCuentaServiceTests,AlmacenamientoImagenesServiceTests,ConfiguracionCuentaMvcTests,ActualizarPerfilRequestDTOTests,PasswordRecoveryServiceTests' test`: **37/37**, sin errores/fallos; incluye error de escritura, fallo de borrado y reintento, referencia ajena, almacenamiento separado y protección antes de commit. `mvnw.cmd -q '-Dtest=ConfiguracionCuentaMySqlTests' test` con `DB_NAME=insectopia_test`: **3/3**, MySQL 8.4, migraciones existentes validadas, base `insectopia_test` comprobada explícitamente. Verificó colisión concurrente `uk_usuarios_nombre_usuario` (una sola cuenta gana), BCrypt/`versionToken`/JWT anterior 401/login anterior 401/nuevo 200 y eliminación administrativa con rollback, outbox tras commit y avatar de tercero intacto. No se usó la base de desarrollo ni producción; las cuentas de test y archivos generados por las pruebas se limpian. No se ejecutó suite completa ni frontend en esta iteración (no se modificó frontend). Pendiente: verificar despliegue y restauración de archivos en VPS; un corte de energía que impida persistir físicamente **tanto** el archivo **como** su marca en el mismo instante no está cubierto por una garantía de fsync de directorio. El reintento requiere que el servicio vuelva a arrancar con acceso al directorio persistente y a la BD.
