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

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
