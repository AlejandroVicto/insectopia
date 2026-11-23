# Integración backend — Actividad 074: Mi perfil

Estado: **implementado**. No se crearon permisos nuevos, no se modificaron MySQL, Flyway,
migraciones, `application.properties`, `.env`, frontend, Login, Registro, `GET /api/auth/me`,
`GET /api/usuarios/seguidos` ni el feed. No se implementaron 076 (seguimiento) ni 077 (edición).

## Endpoints

| Método | Ruta | Respuesta |
| --- | --- | --- |
| `GET` | `/api/usuarios/me` | `MiPerfilResponseDTO` (200) |
| `GET` | `/api/usuarios/me/publicaciones?page=0&size=10` | `PaginaDTO<PublicacionResponseDTO>` (200) |

Ambos exigen `Authorization: Bearer <JWT>` y la autoridad existente `CONTENIDO_LEER`.

Ejemplo de perfil (valores de prueba, sin datos reales):

```json
{
  "idUsuario": 7,
  "nombre": "María",
  "nombreUsuario": "maria",
  "fotoPerfil": null,
  "biografia": null,
  "paisCodigo": "MX",
  "estadoRegion": "Oaxaca",
  "fechaRegistro": "2024-03-05T10:30:00",
  "totalSeguidores": 12,
  "totalSeguidos": 4,
  "totalPublicaciones": 9
}
```

Ejemplo de paginación vacía:

```json
{
  "content": [],
  "number": 0,
  "size": 10,
  "totalElements": 0,
  "totalPages": 0,
  "first": true,
  "last": true
}
```

## Cumplimiento (19 puntos)

1. **Perfil privado.** `UsuarioController#miPerfil` expone `GET /api/usuarios/me` con `@PreAuthorize(CONTENIDO_LEER)`.
2. **Publicaciones propias.** `UsuarioController#publicaciones` expone `GET /api/usuarios/me/publicaciones`.
3. **Identidad del principal.** El controlador recibe `@AuthenticationPrincipal InsectopiaUserDetails` y el servicio usa únicamente `principal.idUsuario()`.
4. **Sin identidad externa.** No se declaran `@RequestParam`, `@RequestHeader` ni `@RequestBody` con `idUsuario`; parámetros como `?idUsuario=999` o `X-Usuario-Id: 999` se ignoran. Un principal nulo o sin id produce 401 (`AuthenticationCredentialsNotFoundException`).
5. **DTO exacto.** `MiPerfilResponseDTO` contiene sólo `idUsuario`, `nombre`, `nombreUsuario`, `fotoPerfil`, `biografia`, `paisCodigo`, `estadoRegion`, `fechaRegistro`, `totalSeguidores`, `totalSeguidos` y `totalPublicaciones`.
6. **Opcionales reales.** `fotoPerfil` y `biografia` se serializan como `null` cuando la entidad no los tiene; no se inventan valores.
7. **Fecha real.** `fechaRegistro` se copia de `Usuario.getFechaRegistro()`; no se usa la fecha del token ni `now()`.
8. **Seguidores reales.** `SeguidorRepository.countBySeguido_IdUsuario(idUsuario)`.
9. **Seguidos reales.** `SeguidorRepository.countBySeguidor_IdUsuario(idUsuario)`.
10. **Publicaciones reales.** Nuevo `PublicacionRepository.countByUsuario_IdUsuarioAndEstado(idUsuario, VISIBLE)`; no hay cifras demo.
11. **Conteos consistentes.** El mismo predicado (`usuario = principal AND estado = VISIBLE`) alimenta `totalPublicaciones` y el `countQuery` de la página; `totalPublicaciones == totalElements` está probado.
12. **Sólo visibles.** `listarPropias` filtra por `EstadoPublicacion.VISIBLE`; ocultas y eliminadas quedan fuera.
13. **Orden estable.** `PageRequest` con `fechaPublicacion desc` y `idPublicacion desc`, sin orden en memoria.
14. **Paginación en base de datos.** `findPropiasVisibles` usa consulta con `countQuery` y `join fetch p.usuario`; la paginación la resuelve MySQL.
15. **Parámetros validados.** `page=0` y `size=10` por defecto, `size <= 50`, `@Validated` + `@Min/@Max`; valores inválidos devuelven 400 con `ErrorResponseDTO`.
16. **Contrato reutilizado.** Se devuelve `PaginaDTO.from(...)` con `PublicacionResponseDTO`, el mismo DTO del feed; la forma JSON es `content, number, size, totalElements, totalPages, first, last`.
17. **Sin N+1.** Los totales de comentarios/reacciones y la reacción propia se obtienen en tres consultas agrupadas por página; el autor se resuelve con `join fetch`. No se usa `countByPublicacion_IdPublicacion` por fila.
18. **Privacidad.** No se exponen `contrasena`, tokens, `correo`, `telefono`, `fechaNacimiento`, `genero`, `recibirSms`, `recibirWhatsapp`, `versionToken`, preferencias ni entidades JPA. Se usan DTOs explícitos e inyección por constructor con `@Transactional(readOnly = true)`.
19. **Seguridad y alcance.** Se respeta `SecurityConfig`: 401 sin JWT, 403 sin `CONTENIDO_LEER`, 404 controlado si el usuario no existe. No se tocaron permisos en DB, migraciones ni rutas existentes; el frontend 073/075 sigue comunicando pendiente la visualización de publicaciones propias (integración a cargo de ese frente).

## Pruebas

- `services/UsuarioServiceTests.java` — registro real, conteos, nulos, 404, principal sin id, aislamiento de datos privados y coincidencia de totales.
- `services/PublicacionesServicePropiasTests.java` — filtro VISIBLE, orden, paginación, agregados agrupados, ausencia de N+1 y página vacía.
- `controllers/UsuarioControllerMvcTests.java` — 401, 403, 400, DTO compatible con `adaptarPerfil`, nulos, campos prohibidos, 404, metadatos de pagina y ausencia de publicaciones ajenas.

Comandos ejecutados desde `backend/`:

```powershell
.\mvnw.cmd test
.\mvnw.cmd package -DskipTests
```

Nota de entorno: la unidad C: estaba sin espacio libre, por lo que `TEMP`, `TMP` y `java.io.tmpdir`
se redirigieron a `backend/target/tmp` (ignorado por Git) para permitir a Surefire crear sus
archivos. El `mysql_native_password` del MySQL local no está cargado: las 14 pruebas
`@SpringBootTest` preexistentes fallan al cargar el contexto **antes de 074**; las 18 pruebas
nuevas y el resto de las pruebas sin base de datos pasan. No se modificó la configuración
protegida para corregir ese entorno.
