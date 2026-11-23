# Recuperación de contraseña y correo reutilizable (056 / 090)

Backend para el flujo ya implementado en React 055. Expone dos endpoints públicos, reutiliza `tokens_recuperacion` y `Usuario.versionToken`, y centraliza el envío de correo en `EmailService`. **No se añadieron migraciones**, no se tocó la cuenta protegida `demo.marina.vega` y no se configuró Postfix/VPS: eso pertenece a la actividad 089 y sigue pendiente.

## Contrato HTTP

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/api/auth/forgot-password` | `{"correo":"usuario@ejemplo.com"}` | `202` + `{"message":"Si el correo está asociado a una cuenta de Insectopia, recibirás un enlace para crear una nueva contraseña."}` |
| POST | `/api/auth/reset-password` | `{"token":"<TOKEN>","contrasena":"NuevaClave123!"}` | `200` + `{"message":"Tu contraseña se actualizó correctamente."}` |

- `correo` se normaliza (trim + minúsculas) y se valida con `@Email`, patrón y tamaño máximo 150.
- `token` se recorta; la **contraseña no se recorta, normaliza ni transforma** antes de BCrypt.
- La contraseña usa las mismas reglas de registro: mínimo 8 caracteres, una mayúscula, un número y un carácter especial. No hay campo de confirmación.
- Ambas rutas están en `SecurityConfig.permitAll()` y en `JwtAuthenticationFilter.shouldNotFilter()`.
- `forgot-password` devuelve exactamente el mismo código, cuerpo y mensaje para correo registrado, inexistente, inactivo, bloqueado o no elegible. No se distingue por status, body ni detalles.
- Ejemplo:

```bash
curl -i -X POST http://localhost:8080/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"correo":"usuario@ejemplo.com"}'

curl -i -X POST http://localhost:8080/api/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"<TOKEN_DEL_CORREO>","contrasena":"NuevaClave123!"}'
```

## Errores del enlace

`TokenRecuperacionException` se traduce en `GlobalExceptionHandler` a un DTO separado (`TokenErrorResponseDTO`), sin modificar `ErrorResponseDTO`. Ningún error describe la cuenta asociada.

| Código | HTTP | Mensaje | Cuándo |
|---|---|---|---|
| `TOKEN_INVALID` | 400 | `El enlace de recuperación no es válido.` | Hash inexistente, cuenta no elegible, usuario/token inconsistentes |
| `TOKEN_EXPIRED` | 400 | `El enlace de recuperación venció.` | `fecha_expiracion` igual o anterior al reloj UTC actual |
| `TOKEN_USED` | 400 | `El enlace de recuperación ya fue utilizado.` | `fecha_uso` ya presente, incluida reutilización concurrente |

Fallos MySQL o SMTP **no** se convierten en errores de token: se propagan/rollback o se registran de forma enmascarada según corresponda.

## Token y seguridad

- `RecoveryTokenGenerator`: `SecureRandom` de 32 bytes (256 bits), Base64URL sin padding (43 caracteres `[A-Za-z0-9_-]`).
- En `tokens_recuperacion` sólo se guarda `SHA-256` en hexadecimal de 64 caracteres. El token claro nunca se persiste ni se escribe en logs; los `toString()` de los DTO y del generador lo redactan.
- Validez por defecto: 15 minutos, configurable con `PASSWORD_RESET_EXPIRATION_MINUTES` (1–1440).
- Tiempo siempre UTC e inyectable mediante un `Clock` bean (`PasswordRecoveryConfig`), lo que permite pruebas deterministas.
- La URL se construye desde `APP_FRONTEND_BASE_URL` + `/restablecer-contrasena?token=...`, nunca desde la cabecera `Host` de la petición. El valor se codifica con `UriUtils.encode(..., UTF_8)`.
- Un solo uso concurrente: se obtiene el `id_usuario` del hash, se bloquea primero esa fila con `bloquearPorId` (`PESSIMISTIC_WRITE`) y después la fila del token con `bloquearPorHash`. Ese orden evita interbloqueos entre enlaces distintos de la misma cuenta.
- Al emitir un enlace nuevo se invalidan los pendientes; al cambiar la contraseña se marca el token usado y se invalidan los demás.
- El reset es atómico en una transacción: elegibilidad → hash/expiración/uso → BCrypt → `fecha_uso` → invalidar otros → `versionToken + 1`. Cualquier excepción provoca rollback.
- `versionToken + 1` revoca los JWT emitidos antes del cambio; `AuthService.login` y `JwtAuthenticationFilter` ya comparan esa versión. Por eso el texto de éxito de React 055 se ajustó a «Las sesiones abiertas anteriormente se han cerrado automáticamente.». Es el único cambio en `frontend/`: no se modificó diseño ni lógica del formulario.

### Solicitud

1. Límite de frecuencia (antes de buscar la cuenta).
2. Generar token y hash.
3. Transacción: buscar correo normalizado, comprobar `ACTIVO` y no cuenta protegida, invalidar pendientes, guardar hash/creación/expiración. Confirmar.
4. Enviar correo **después del commit**. Si SMTP falla, se registra un `warn` con destinatario enmascarado y se devuelve la misma `202`. El enlace ya confirmado sigue siendo válido durante su ventana; el documento no garantiza entrega.

### Restablecimiento

1. Hash del token recibido y búsqueda del `id_usuario` (sin bloqueo).
2. Transacción con bloqueo pesimista de usuario y token, validaciones de estado/propiedad/uso/expiración.
3. BCrypt de la contraseña tal cual llegó, incremento de `versionToken`, `fecha_uso` e invalidación de otros tokens.
4. Respuesta `200` tras el commit.

## Límites de frecuencia

`PasswordRecoveryRateLimiter` es en memoria, por correo normalizado y por IP de origen, con `ConcurrentHashMap` acotada (`RESET_MAX_TRACKED_ORIGINS`) y `Clock` UTC. Se aplica **antes** de consultar la cuenta, de modo que existencia y no existencia consumen el mismo presupuesto. Los contadores se reinician al reiniciar la aplicación; para varias réplicas haría falta un store compartido (no implementado).

| Variable | Default | Significado |
|---|---|---|
| `RESET_EMAIL_MIN_INTERVAL_SECONDS` | `60` | Intervalo mínimo entre solicitudes del mismo correo |
| `RESET_EMAIL_MAX_ATTEMPTS` | `3` | Máximo de solicitudes por correo en la ventana |
| `RESET_EMAIL_WINDOW_MINUTES` | `15` | Ventana del límite por correo |
| `RESET_IP_MAX_ATTEMPTS` | `30` | Máximo de solicitudes por IP en la ventana |
| `RESET_IP_WINDOW_MINUTES` | `15` | Ventana del límite por IP |
| `RESET_MAX_TRACKED_ORIGINS` | `10000` | Tope de claves rastreadas por mapa |

La IP se toma de `request.getRemoteAddr()`. `X-Forwarded-For` se ignora por defecto. Sólo se activa `RemoteIpValve` cuando `TRUST_FORWARDED_HEADERS=true` y `TRUSTED_PROXIES` contiene expresiones explícitas de los proxies de confianza; así un cliente no puede falsificar su origen.

## Servicio de correo

`EmailService` es el punto único de envío (`JavaMailSender` + `MimeMessageHelper`), reutilizable para futuros correos del sistema.

- UTF-8 explícito en cabeceras y cuerpo. En Spring 7 `setText(String, String)` es para alternativas multipart, por lo que el cuerpo se fija con `mensaje.setText(cuerpo, "UTF-8")` y `Content-Type: text/plain; charset=UTF-8`.
- Remitente configurable con `MAIL_FROM`, asunto `Insectopia — Recuperación de contraseña`, texto plano con el enlace y la caducidad.
- Logs sin token, enlace, contraseña ni cuerpo; sólo destinatario enmascarado (`p***@ejemplo.com`) y clase de excepción.
- La API acepta SMTP local de Mailpit y Postfix en loopback sin cambiar código.

## Configuración por entorno

`PasswordRecoveryProperties` valida la configuración al arrancar. Con `APP_ENVIRONMENT=production|prod|vps` o perfiles `prod|production|vps` exige HTTPS, host real (rechaza `localhost`, `.invalid`, `.example`, `.test`, `DOMINIO_REAL`, etc.) y `MAIL_FROM` con dominio real.

| Variable | Local (Mailpit) | VPS (Postfix) |
|---|---|---|
| `APP_ENVIRONMENT` | `local` | `production` |
| `APP_FRONTEND_BASE_URL` | `http://localhost:5173` | `https://<dominio-real>` |
| `MAIL_HOST` | `127.0.0.1` | `127.0.0.1` |
| `MAIL_PORT` | `1025` | `25` |
| `MAIL_FROM` | `no-reply@insectopia.invalid` | `no-reply@<dominio-real>` |
| `MAIL_SMTP_AUTH` / `MAIL_SMTP_STARTTLS` | `false` | `false` si Postfix local; sólo cambiar si el proveedor lo exige |
| `PASSWORD_RESET_EXPIRATION_MINUTES` | `15` | `15` |
| `TRUST_FORWARDED_HEADERS` | `false` | `true` sólo si hay Nginx delante |
| `TRUSTED_PROXIES` | `127\.0\.0\.1|::1` | IP real de Nginx |

Los valores están en `backend/src/main/resources/application.properties`, `application.properties.example` y `backend/.env.example`. El fichero `backend/.env` local no se modificó ni se versionó.

Para Mailpit local:

```bash
docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
# buzón web: http://localhost:8025
```

## Archivos del cambio

**Nuevos:** `ForgotPasswordRequestDTO`, `ResetPasswordRequestDTO`, `MensajeResponseDTO`, `TokenErrorResponseDTO`, `TokenRecuperacionException`, `RecoveryTokenGenerator`, `PasswordRecoveryProperties`, `PasswordRecoveryConfig`, `PasswordRecoveryRateLimiter`, `EmailService`, `PasswordRecoveryService`.

**Modificados:** `AuthController` (dos endpoints), `GlobalExceptionHandler` (handler de token), `TokenRecuperacionRepository` (`idUsuarioPorHash`, `bloquearPorHash`, `invalidarPendientes`), `application.properties`, `application.properties.example`, `.env.example`, `frontend/src/pages/RecuperacionContrasena.jsx` (sólo texto de éxito).

**Reutilizados sin duplicar:** `SecurityConfig`, `JwtAuthenticationFilter.shouldNotFilter`, `Usuario.versionToken`, `AuthService.login`, esquema `tokens_recuperacion`, `BCryptPasswordEncoder`, `ProtectedAccounts.EVALUATION_ADMIN_USERNAME`.

Se detectó y corrigió un problema real de arranque: Spring 7 no elegía el constructor de `PasswordRecoveryRateLimiter` con `Clock`; se añadió `@Autowired` siguiendo el patrón de `CatalogoUbicacionesService`. Además de la comprobación levantando el backend real, una prueba unitaria verifica que el constructor público conserva `@Autowired` para evitar la regresión.

## Verificación ejecutada (23/11/2026)

- Backend: `./mvnw.cmd -q -DskipTests compile` correcto.
- Pruebas dirigidas: **25/25** (`RecoveryTokenGeneratorTests` 2, `PasswordRecoveryPropertiesTests` 3, `PasswordRecoveryRateLimiterTests` 3, `EmailServiceTests` 2, `PasswordRecoveryServiceTests` 10, `AuthControllerPasswordRecoveryTests` 5).
- React: `RecuperacionContrasena.test.jsx` **13/13**, `npm run lint` limpio, `npm run build` correcto (sólo aviso de chunk >500 kB, preexistente).
- E2E HTTP + SMTP reales contra un backend propio en `127.0.0.1:8081`, base `insectopia_test` (Flyway v12, **sin migraciones nuevas**), sin tocar la instancia del usuario en 8080:
  - Registro de usuario temporal: `201`.
  - Login con contraseña inicial: `200`.
  - `forgot-password`: `202` con el mensaje genérico exacto.
  - Correo MIME capturado por un sink SMTP temporal en `127.0.0.1:1025`: UTF-8, asunto correcto, enlace `http://localhost:5173/restablecer-contrasena?token=...`, token de 43 caracteres.
  - `reset-password`: `200`; `versionToken` `0 → 1`.
  - BD: hash SHA-256 de 64 hex, token en claro **0 filas**, `fecha_uso` marcada, hash BCrypt `$2a$`.
  - Login con contraseña anterior: `401`; con la nueva: `200`; JWT anterior en `/api/auth/me`: `401`.
  - Reutilizar el enlace: `400` + `TOKEN_USED`.
  - Limpieza: se detuvieron únicamente el backend 8081 y el sink 1025; el PID 2584 de 8080 sigue intacto.

**No ejecutado:** Mailpit (Docker CLI presente pero daemon `npipe:////./pipe/dockerDesktopLinuxEngine` no disponible y `com.docker.service` no se pudo iniciar), entrega real a buzón externo, Postfix y VPS. La aceptación SMTP del sink no demuestra entrega a INBOX; actividad 089 continúa pendiente.

## Configuración futura de Postfix en VPS — Actividad 089

Comprobaciones pendientes en el VPS (no realizadas en este cambio):

1. Instalar Postfix y confirmar que el servicio queda activo y habilitado tras reinicio.
2. Confirmar que escucha sólo en `127.0.0.1:25` (o `::1`) y nunca en `0.0.0.0:25`.
3. Configurar `myhostname` y `mydomain` con el dominio real del proyecto.
4. Configurar `inet_interfaces = loopback-only` y el protocolo IP previsto.
5. Restringir `mynetworks` a loopback y verificar con un relay externo que **no** hay open relay.
6. Publicar el registro SPF TXT del dominio emisor.
7. Generar la clave DKIM, configurar el firmante y publicar el TXT DKIM.
8. Publicar la política DMARC (empezar en `p=none` y monitorizar antes de endurecer).
9. Verificar PTR/rDNS de la IP pública del VPS hacia `myhostname`.
10. Comprobar que `myhostname` resuelve por DNS directo e inverso y coincide con el HELO/EHLO.
11. Crear/verificar el buzón o alias `MAIL_FROM` real y con monitoreo de rebotes.
12. Ajustar el entorno del backend: `APP_ENVIRONMENT=production`, `APP_FRONTEND_BASE_URL=https://<dominio-real>`, `MAIL_HOST=127.0.0.1`, `MAIL_PORT=25`, `MAIL_FROM` real y, si hay Nginx, `TRUST_FORWARDED_HEADERS=true` con `TRUSTED_PROXIES` explícito.
13. Reiniciar el backend y confirmar que la validación de producción arranca sin `IllegalStateException` y que el enlace del correo usa HTTPS y el dominio real.
14. Enviar un correo de recuperación a un buzón externo real y verificar que llega a INBOX (no spam), que el enlace funciona y que expira a los 15 minutos.
15. Revisar firewall/TLS y logs: puerto 25 saliente permitido, 25 entrante cerrado, sin token/enlace/contraseña en logs, y que un fallo SMTP simulado sigue devolviendo `202` sin filtrar si la cuenta existe.
