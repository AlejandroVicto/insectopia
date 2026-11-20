# Inicio (059) → Backend de publicaciones (060)

Este documento es una **propuesta de contrato**, no describe endpoints de publicaciones ya implementados. El código JSX de Figma solo define la presentación. `/app` está detrás de `ProtectedRoute`; Axios obtiene el Bearer de `AuthProvider`, sin almacenarlo en el feed.

## Configuración y conexión

1. Para visualizar la referencia sin API, añade `VITE_INICIO_MOCK=true` a tu configuración local de Vite y reinicia Vite. El archivo `frontend/.env.example` incluye la opción; **no se modificó `.env`**. En demo aparecen una etiqueta discreta, cuatro publicaciones editoriales, dos páginas, vistas Para ti/Global y búsqueda local. No se envían solicitudes del feed al backend.
2. Para conectar la API, usa `VITE_INICIO_MOCK=false` (o elimina la variable) y `VITE_API_URL=http://localhost:8080` en el entorno existente. Reinicia Vite. En este modo **nunca** se sustituyen errores de red por fixtures.
3. Implementa `GET /api/publicaciones` autenticado. `src/services/publicacionesService.js` concentra la petición y acepta `AbortSignal`. Si cambia el contrato, modifica `src/adapters/publicacionesAdapter.js` sin reescribir las tarjetas.
4. Confirma paginación, orden y búsqueda con pruebas HTTP antes de habilitarlo en producción. Ejecuta `npm run lint`, `npm run build` y `npm test`.

## Consulta propuesta

`GET /api/publicaciones?page=0&size=10&feed=para-ti&q=escarabajo` con Bearer JWT. `page` es base cero, `size` es número de registros **paginados en MySQL**, `q` es búsqueda opcional **pendiente de acordar**, `feed=para-ti|global` también **pendiente de acordar**. Orden propuesto: `fechaPublicacion DESC, idPublicacion DESC` estable. Definir con backend qué significa «Para ti» (no hay algoritmo en el frontend). Los cambios de filtro o búsqueda reinician `page=0`; el navbar espera 350 ms, la página cancela solicitudes anteriores y descarta respuestas obsoletas. En modo demo usa 2 elementos por página solo para mostrar la interfaz.

**Respuesta propuesta** (similar a Spring Data `Page`, no confirmada):

```json
{
  "content": [{
    "id": 24,
    "autor": { "id": 7, "nombre": "María", "nombreUsuario": "maria", "avatarUrl": null },
    "titulo": null,
    "contenido": "Avistamiento en el jardín",
    "imagenUrl": null,
    "fechaPublicacion": "2026-11-20T08:00:00",
    "estado": "VISIBLE",
    "totalComentarios": 2,
    "totalReacciones": 5,
    "reaccionUsuario": null
  }],
  "number": 0, "size": 10, "totalElements": 1, "totalPages": 1, "first": true, "last": true
}
```

El adaptador exige identificador de publicación, contenido, autor público (id, nombre y `nombreUsuario`) y metadatos válidos de paginación. Admite alias `idPublicacion`, `usuario`, `imagen` y `fotoPerfil` para facilitar el acuerdo del DTO. `titulo`, imagen, avatar y fecha son opcionales; los contadores ausentes se presentan como «—», **no como cero inventado**. Un DTO incompleto da error visible y reintento, nunca publicaciones ficticias. Confirmar forma y zona horaria de la fecha: `LocalDateTime` no incluye offset; acordar UTC/ISO 8601 o zona explícita. No serializar entidades JPA ni colecciones enteras de comentarios o reacciones.

`Publicacion` ya tiene `idPublicacion`, `contenido`, `imagen`, `fechaPublicacion`, `estado` y `usuario`; **no tiene `titulo`**. `Usuario` tiene nombre público, alias y foto de perfil. Los totales necesitan agregaciones/proyecciones por publicación, y `reaccionUsuario` debe resolverse con el principal autenticado. No se requiere una columna nueva para esas cifras. Exponer solo publicaciones autorizadas/visibles; definir si las propias no visibles deben incluirse.

**Errores:** 401 sigue el interceptor existente (se pierde sesión y se redirige); 403, 404, 500, respuesta inesperada y fallos de red muestran error y botón de reintento. Una lista vacía muestra «Aún no hay avistamientos»; una página sin resultados conserva navegación anterior si corresponde. Nunca insertar fixtures tras una falla en modo API.

## Comentarios y reacciones (contratos pendientes de acordar)

- **Comentarios:** acordar endpoints autenticados de consulta paginada y creación, DTO público con id, autor, contenido y fecha, validación, permisos de autor/moderación, errores y retorno de contador actualizado tras confirmación. No hay solicitudes de comentarios desde 059.
- **Reacciones:** acordar endpoints autenticados para registrar/quitar `ME_GUSTA`, devolver estado propio y total confirmado; evitar duplicados mediante unicidad por usuario y publicación (ya definida en `Reaccion`). No actualizar contadores optimistamente sin confirmación. No hay solicitudes de reacciones desde 059.
- **Compartir:** habilitar solo al definir una ruta pública real de publicación; no generar URLs de ejemplo. El menú de acciones necesita permisos y endpoints acordados.

## Dependencias fuera de 060

Seguimiento de usuarios, especies en tendencia, próximos eventos, mapa real, creación avanzada (061) y moderación/acciones de publicaciones requieren contratos y recursos independientes. En API real la columna complementaria aparece sin datos ficticios hasta disponer de ellos. El botón «Ver detalles» lleva a la ruta existente `/app/eventos`, que por ahora es un placeholder; no se crean enlaces a eventos individuales inexistentes. El escarabajo de `src/assets/escarabajo-demo.svg` es **una ilustración**, no la fotografía de Figma; reemplazarla por el recurso original autorizado cuando se proporcione. Los controles sin backend están deshabilitados y no simulan persistencia.

## Pruebas de integración futuras

Con la API 060 disponible: autenticar con usuario real, comprobar Bearer, 200 con `content`/metadatos, páginas consecutivas sin duplicados, filtros `para-ti`/`global` y `q` desde MySQL, estados vacío/401/403/error, cancelación al cambiar de vista y límites de permisos. Contrastar totales y reacción propia con la base sin exponer relaciones privadas. No afirmar esta integración hasta ejecutarla contra un backend funcional.
