# Actividad 055 — Recuperación de contraseña (escritorio)

## Archivos

- `src/App.jsx`: rutas públicas; no se cambió el funcionamiento del login ni del registro.
- `src/pages/Registro.jsx`: se retiraron la barra superior derecha y el icono de búsqueda para mantener la misma composición institucional que login y recuperación.
- `src/pages/RecuperacionContrasena.jsx`, `src/pages/recuperacion.css`: layout institucional compartido, formularios, estados, iconos, accesibilidad y estilos de escritorio 1440 × 900.
- `src/services/recuperacionService.js`: solicitudes Axios públicas y clasificación conservadora de errores.
- `src/pages/RecuperacionContrasena.test.jsx`, `src/services/recuperacionService.test.js`: pruebas del flujo, contrato, privacidad y navegación.

## Rutas y frames

| Ruta | Frame Figma | Vista React |
| --- | --- | --- |
| `/recuperar-contrasena` | `31:404` solicitar enlace; `32:403` errores | `Solicitud` |
| `/recuperar-contrasena` tras HTTP exitoso | `31:447` correo enviado | `CorreoEnviado` |
| `/restablecer-contrasena?token=...` | `31:488` crear contraseña; `32:444` errores | `Clave` |
| `/restablecer-contrasena` sin token o con rechazo explícito | `31:537` enlace inválido | `EstadoFinal` |
| `/restablecer-contrasena` tras HTTP exitoso de restablecimiento | `32:490` contraseña actualizada | `EstadoFinal` |

Los cinco estados usan un único `Layout` con panel institucional izquierdo (logo local de Insectopia, biodiversidad, círculos decorativos y pilares) y panel derecho variable. Se usan Mulish, colores oscuros y lima, y proporciones de los frames proporcionados. Solo escritorio: el contenido se adapta al alto y ancho de la ventana, como en login/registro, sin exigir un lienzo mínimo de 900 px ni desplazamiento para alturas habituales de escritorio. Ante alturas extraordinariamente reducidas se permite desplazamiento para no recortar controles. Se eliminaron el acceso redundante a login de la esquina superior derecha, el pie de seguridad del formulario y los dos textos accesorios de la solicitud; se mantiene el enlace de regreso al login en todos los estados.

## Solicitudes HTTP y validaciones

- `POST /api/auth/forgot-password`, JSON `{ "correo": "persona@ejemplo.com" }` (recortado y en minúsculas). Correo obligatorio, formato de registro y máximo 150 caracteres. Respuesta visual genérica **solo** si el servidor confirma la solicitud. Errores de red o endpoint ausente permiten reintentar; nunca se revela si existe una cuenta.
- `POST /api/auth/reset-password`, JSON `{ "token": "...", "contrasena": "..." }`. Confirmación local, sin contraseña anterior ni confirmación en el payload. Se reutilizan `validarCampo('contrasena' / 'confirmarContrasena')` de registro: obligatorio, ocho caracteres, mayúscula, número, especial y coincidencia. Los botones permiten mostrar/ocultar individualmente. Los campos presentan `aria-invalid`, `aria-describedby` y errores bajo el control; el formulario evita doble envío y anuncia carga, errores y éxito.
- Ambas llamadas usan `services/api.js` con `{ skipAuth: true }`: sin JWT, incluso con sesión antigua. No hay llamadas SMTP desde React.

## Seguridad y fallos

El token se obtiene solo del enlace, se conserva únicamente en memoria de la vista y se elimina inmediatamente de la entrada de historial con `replaceState` (y de la ubicación del router con `replace`). Nunca se almacena ni se presenta en texto, logs o enlaces. La mera presencia del token **no lo valida**; el backend decide al restablecer. Sin token, se ofrece solicitar otro. Después de éxito o rechazo explícito el token se elimina del estado y no puede reutilizarse desde la pantalla.

Solo códigos de error inequívocos (`TOKEN_INVALID`, `TOKEN_EXPIRED`, `TOKEN_USED` o equivalentes documentados en el servicio) y mensajes inequívocos de token/enlace inválido, vencido o usado llevan a la vista `31:537`. Un 400/404 genérico, problema de red o fallo técnico deja el formulario disponible para reintentar, sin éxito ficticio ni exposición del mensaje arbitrario del servidor. La nota tras el cambio **no afirma cierre de sesiones anteriores**, pues aún no se ha confirmado ese comportamiento; recomienda cerrarlas manualmente.

## Integración pendiente 056/090

En el árbol local, `AuthController` todavía **no** implementa ninguno de los dos endpoints ni existen DTO de recuperación: solo están permitidas las rutas en `SecurityConfig` y excluidas del filtro JWT. La actividad 056 debe confirmar nombres exactos de campos del DTO y esquema de errores de token y, si difieren, ajustar exclusivamente `recuperacionService.js`; debe confirmar también si invalida sesiones previas. La actividad 090 debe entregar los correos y el enlace real a `/restablecer-contrasena?token=...` (origen frontend configurado). No se simula envío ni se incorporan claves SMTP.

## Verificación

- Pruebas dirigidas finales: **132 pruebas frontend** de los layouts y vistas implicados y **51 pruebas backend** de servicios y controladores implicados, todas satisfactorias.
- `npm run lint`: **correcto**, sin errores.
- `npm run build`: **correcto**. Vite mantiene el aviso no bloqueante del bundle principal > 500 kB.
