# React + Vite

## Actividad 047: rutas y sesión

`AuthProvider` guarda el JWT y los datos mínimos del usuario **solo en memoria**. El futuro login
podrá llamar a `setSession({ token, user: { id, role, name } })` con datos del backend. No se
decodifican ni validan tokens en React: la autorización real corresponde al backend. Al recargar
la página se pierde la sesión; su persistencia se resolverá al integrar los flujos reales.

Rutas públicas: `/`, `/health`, `/login`. Rutas de infraestructura: `/app`, `/moderacion` y
`/administracion`. Las pantallas privadas son marcadores temporales, no interfaces definitivas.
`ProtectedRoute` acepta `allowedRoles` y `RoleGate` controla visibilidad, nunca permisos del
servidor. El cliente API adjunta Bearer solo cuando hay sesión; 401 invalida la sesión que envió
ese token, 403 conserva la sesión. Las peticiones públicas pueden usar `skipAuth: true`.

Ejecutar `npm run lint`, `npm run build` y `npm test`.

## Actividad 050: navegación de escritorio

Las rutas privadas comparten `PrivateLayout` (`Navbar`, `Sidebar`, `UserAccount` y
`LogoutConfirmModal`). Las rutas públicas permanecen fuera del layout. Las secciones nuevas
(`mensajes`, `notificaciones`, `eventos`, `perfil`, `configuración`) son solo placeholders;
moderación y administración conservan los permisos de 047. El logo oficial está en
`src/assets/logo.png`; los exportados locales de Figma están ignorados por Git.

La cuenta muestra `name`, `email` y opcionalmente `avatarUrl` cuando estén presentes en la
sesión; si faltan, se muestra un estado neutro o un avatar predeterminado. No hay sesión real
hasta integrar el login. `notificationCount` es opcional: sin un dato de la API no se muestra
ninguna cifra. Búsqueda y creación de publicaciones siguen deshabilitadas; no existe todavía
su funcionalidad. Confirmar «Cerrar sesión» solo limpia el estado local y navega a `/login`:
**no revoca el JWT en el servidor ni llama a un endpoint de logout**. Esa integración queda
pendiente para las actividades 057–058.

## Actividad 053: login (frontend)

Ruta pública `/login` con el diseño de Figma: panel institucional izquierdo (~55 %) y
formulario derecho (~45 %), una sola columna en móvil. El acceso usa **correo**
(`autoComplete="email"`), no nombre de usuario; la contraseña solo valida presencia y
puede mostrarse/ocultarse con un botón accesible. Los enlaces a `/registro` y
`/recuperar-contrasena` quedan listos; la pantalla 055 todavía no existe.

`src/services/loginService.js` prepara `POST /api/auth/login` con Axios
(`skipAuth: true`) y adapta la respuesta a `setSession({ token, user })` de
`AuthProvider`, que es el único dueño de la sesión. Tras iniciar sesión se respeta
`location.state.from` cuando es una ruta interna segura; si no, se redirige por rol
(`/app`, `/moderacion` o `/administracion`). No se decodifica el JWT ni se guarda en
localStorage. Google es el único proveedor externo previsto y aparece deshabilitado
hasta que exista OAuth real.

**Bloqueo verificado:** `SecurityConfig` marca `/api/auth/login` como `permitAll`, pero
no hay controlador ni DTO que implemente el endpoint. Por eso la pantalla muestra
«Inicio de sesión no disponible» y no crea sesiones ficticias. Cuando el backend 054
exponga el endpoint, definir `VITE_LOGIN_DISPONIBLE=true` y confirmar los nombres
exactos del cuerpo y de la respuesta.

## Actividad 051: registro (frontend)

Ruta pública `/registro`. Conserva el diseño exportado de Figma: panel institucional izquierdo,
formulario derecho sobre fondo oscuro y acentos verde lima. El logo oficial se reutiliza desde
`src/assets/logo.png`.

El formulario valida al escribir, al salir del campo y al enviar, con mensajes asociados mediante
`aria-describedby`. `src/utils/validacionRegistro.js` concentra las reglas y
`src/services/authService.js` prepara `POST /api/auth/register` con Axios (`skipAuth: true`) y
normaliza respuestas 400/422 por campo, conflictos 409, 404 y errores de conexión. La
confirmación y la aceptación de términos no se envían al backend.

**Bloqueo verificado:** en este repositorio solo existe `GET /api/health`; no hay controlador que
implemente `/api/auth/register` ni catálogo de países/regiones acordado. Por eso la pantalla se
muestra en estado «Registro no disponible» y no simula guardados. Para habilitarla una vez que el
backend 052 exponga el endpoint y el catálogo, definir `VITE_REGISTRO_DISPONIBLE=true` y sustituir
los campos libres de código ISO/región por los selectores del catálogo acordado.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
