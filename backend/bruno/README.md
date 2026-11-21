# Colección Bruno — actividad 060

Colección mínima nueva (no existía otra en el repositorio) para comprobar los endpoints con JWT.

1. Abrir `backend/bruno` como colección en Bruno.
2. Seleccionar el entorno `Local` (`baseUrl=http://localhost:8080`).
3. Obtener un token con `POST /api/auth/login` (usuario real o demo solo en desarrollo) y copiar el `token` en la variable secreta `token` del entorno.
4. Ejecutar las peticiones en orden. La segunda llamada a `07-reaccionar.bru` debe devolver `409` con `details[0].field = "publicacionId"`.

Ajustar los identificadores `1` de las rutas a publicaciones existentes en la base de pruebas. Esta colección **no se ejecutó** durante la implementación: el MySQL local no estaba disponible.
