# Actividad 068 — Backend de notificaciones

> Actualización de integración 063–068: los párrafos históricos que indican que mensajería no envía mensajes ni genera avisos quedan reemplazados por el contrato definitivo al final de este documento.

La tabla `notificaciones` y sus relaciones son las de Flyway V5/V6/V7. No se cambia el esquema ni se ejecuta el seeder `demo`. Todas las operaciones requieren `Authorization: Bearer <JWT>`; el destinatario se obtiene exclusivamente del principal validado por Spring Security. No se acepta un `id_destinatario` de la petición.

## Contrato HTTP

| Método | Ruta | Éxito | Notas |
| --- | --- | --- | --- |
| GET | `/api/notificaciones?page=0&size=10&filtro=todas` | 200 | `filtro`: `todas`, `no-leidas`, `leidas`. `page` ≥ 0; `size` de 1 a 50. Orden `fechaCreacion DESC, idNotificacion DESC`. |
| GET | `/api/notificaciones/no-leidas/count` | 200 | `{ "count": 2 }` (número entero). |
| PATCH | `/api/notificaciones/{id}/leer` | 200 | Devuelve el aviso actualizado, incluso si ya estaba leído. Sin cuerpo. |
| PATCH | `/api/notificaciones/leer-todas` | 200 | `{ "count": 0 }`. Sin cuerpo; repetible. |
| DELETE | `/api/notificaciones/{id}` | 204 | Sin cuerpo. Una segunda eliminación devuelve 404. |

Ejemplo de respuesta **con la forma exacta del JSON** de GET (valores ilustrativos):

```json
{
  "content": [
    {
      "id": 9,
      "tipo": "COMENTARIO",
      "contenido": "Alguien comentó tu publicación",
      "actor": { "id": 2, "nombre": "Ana", "nombreUsuario": "ana", "avatarUrl": null },
      "fechaCreacion": "2026-11-20T09:00:00",
      "leida": false,
      "recurso": { "tipo": "PUBLICACION", "id": 24, "disponible": true, "apiUrl": "/api/publicaciones/24" }
    },
    {
      "id": 8,
      "tipo": "REPORTE_RESUELTO",
      "contenido": "Tu reporte fue resuelto",
      "actor": null,
      "fechaCreacion": "2026-11-19T09:00:00",
      "leida": true,
      "recurso": { "tipo": "REPORTE", "id": 5, "disponible": false, "apiUrl": null }
    }
  ],
  "number": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1,
  "first": true,
  "last": true
}
```

PATCH `/{id}/leer` devuelve **el mismo objeto** que un elemento de `content`, con `leida: true`. `actor` es `null` cuando el actor fue eliminado/desactivado, el recurso no es consultable o se trata de un reporte (para `NUEVO_SEGUIDOR` legado puede aparecer el actor público). En avisos históricos, `recurso` puede ser `{ "tipo": "PUBLICACION", "id": null, "disponible": false, "apiUrl": null }` si la FK se puso a NULL tras borrar físicamente la publicación. Avisos legados de `EVENTO_*` y `NUEVO_MENSAJE` devuelven `recurso.tipo` `EVENTO`/`MENSAJE`, pero sin ID ni enlace verificable. En tipos legados sin recurso conocido, `recurso` es `null`. No se exponen correo, teléfono, contraseña, motivo/resolución del reporte, contenido de la publicación ni rutas suministradas por usuarios.

### Errores

- **400**: `page`, `size` o `filtro` inválidos; identificador con formato incorrecto.
- **401**: JWT ausente, inválido, revocado o vencido (todas las rutas).
- **404**: aviso inexistente **o ajeno** en PATCH/DELETE (misma respuesta, sin distinguir propietarios).
- **500**: error inesperado de persistencia.

El error usa el formato común: `{ "timestamp": "2026-11-20T09:00:00Z", "status": 404, "error": "Not Found", "message": "Recurso no encontrado", "path": "/api/notificaciones/9/leer", "details": [] }` (`timestamp` y `path` corresponden a la petición). El listado vacío devuelve `content: []`, `totalElements: 0` y `totalPages: 0`.

## Origen de los avisos y seguridad de recursos

Los tipos nuevos son `COMENTARIO`, `REACCION`, `REPORTE_RESUELTO` y `REPORTE_RECHAZADO`. Un comentario de otro usuario avisa al autor de la publicación; una reacción nueva de otro usuario avisa una vez por par actor/publicación mientras existe su historial de aviso (una reacción duplicada devuelve el conflicto previo y no crea otro aviso). La resolución final por un moderador avisa al reportante, excepto si él mismo la resolvió. La inserción del aviso participa en la **misma transacción** de la operación: una excepción revierte ambas. La resolución de reportes se bloquea para evitar dos resoluciones concurrentes. Las acciones propias no generan avisos.

Solo se produce `apiUrl` para `GET /api/publicaciones/{id}` si la publicación sigue consultable para ese destinatario: `VISIBLE`, o `OCULTA` propia/moderable. `ELIMINADA` nunca se enlaza. `apiUrl` es generado por el servidor a partir del ID persistido; no es una URL de navegación React ni procede de contenido externo. El cliente debe volver a manejar 403/404 al abrir el recurso (su disponibilidad puede cambiar después del listado). Los reportes no tienen GET individual para el reportante; se conserva su ID propio pero `disponible: false`, `apiUrl: null`. Si un recurso no es accesible, representar **«Este recurso ya no está disponible»** y no construir una URL alternativa con el ID. El backend no inventa rutas del frontend.

Los módulos seguidores, eventos y mensajería tienen modelos y repositorios, pero **no cuentan aún con flujos operativos de seguir, resolver eventos o enviar mensajes**. Al implementarlos, llamar a un generador de avisos dentro de su transacción de negocio, después de validar su acción real, sin crear avisos para uno mismo; no existen avisos nuevos de esos tipos en esta actividad. El seeder `demo` conserva ejemplos legados sin convertirlos en eventos reales.

## React + Axios

```js
// axiosInstance debe añadir el JWT; nunca envíes el destinatario.
const { data: pagina } = await axiosInstance.get('/api/notificaciones', {
  params: { page: 0, size: 10, filtro: 'no-leidas' }
});
const { data: contador } = await axiosInstance.get('/api/notificaciones/no-leidas/count');
await axiosInstance.patch(`/api/notificaciones/${pagina.content[0].id}/leer`);
await axiosInstance.patch('/api/notificaciones/leer-todas');
await axiosInstance.delete(`/api/notificaciones/${pagina.content[0].id}`);

const recurso = pagina.content[0].recurso;
if (!recurso?.disponible || !recurso.apiUrl) {
  // Mostrar "Este recurso ya no está disponible".
} else {
  // Consultar recurso.apiUrl con el mismo JWT y manejar 403/404.
  const { data: publicacion } = await axiosInstance.get(recurso.apiUrl);
  // Navegar a una pantalla que exista en la aplicación, si se dispone de ella.
}
```

## Verificación aislada

Para integrar con MySQL, configurar **fuera de `backend/.env`** `DB_HOST`, `DB_PORT`, `DB_NAME=insectopia_test`, `DB_USER`, `DB_PASSWORD` y `JWT_SECRET` (según la configuración de `application.properties`) y verificar el nombre del esquema **antes** de arrancar Spring/Flyway. No apuntar a `insectopia_dev_v2`. Desde `backend/`: `./mvnw.cmd '-Dtest=NotificacionServiceTests,NotificacionMvcTests,PublicacionesServiceTests,ReportesServiceTests' test`; luego, solo con el entorno de prueba confirmado, `./mvnw.cmd test`.

En MySQL de pruebas, para comprobar persistencia y estado sin mostrar secretos: `SELECT DATABASE();` (debe ser `insectopia_test`); `SELECT version, success FROM flyway_schema_history ORDER BY installed_rank;`; `SELECT id_notificacion, id_destinatario, tipo, leida, fecha_creacion FROM notificaciones ORDER BY id_notificacion DESC LIMIT 10;`; `SELECT COUNT(*) FROM notificaciones WHERE id_destinatario = <ID_PROPIO> AND leida = 0;`. Las pruebas de integración con rollback pueden dejar la tabla sin avisos al finalizar; ejecutar los endpoints con usuarios de prueba para observar registros persistidos.

## Contrato definitivo de avisos de mensajes

`POST /api/conversaciones/{id}/mensajes` crea en la **misma transacción** un aviso `MENSAJE` por destinatario diferente del remitente. La FK `id_mensaje` referencia el mensaje confirmado; `actor` es el remitente del JWT; `leida=false`. El contenido es «Te envió un mensaje privado», sin texto del mensaje. Consultar el historial nunca produce avisos. Si falla la operación, se revierten mensaje y aviso.

Ejemplo de elemento de `GET /api/notificaciones` (también devuelto por `PATCH /api/notificaciones/{id}/leer` con `leida:true`):

```json
{ "id": 15, "tipo": "MENSAJE", "contenido": "Te envió un mensaje privado", "actor": { "id": 2, "nombre": "Ana", "nombreUsuario": "ana", "avatarUrl": null }, "leida": false, "recurso": { "tipo": "MENSAJE", "id": 80, "conversacionId": 5, "disponible": true, "apiUrl": "/api/conversaciones/5" } }
```

`recurso.id` identifica el **mensaje**; `recurso.conversacionId` identifica el chat. Para publicaciones, reportes y eventos el nuevo `conversacionId` vale `null`. Los avisos `NUEVO_MENSAJE` legados con FK verificable pueden resolver el chat; sin FK siguen indisponibles. `GET /api/conversaciones/{id}` vuelve a comprobar pertenencia antes de exponer datos. El cliente navega a `/app/mensajes?conversacion=5`, nunca a `apiUrl`.

Se confirmó `SELECT DATABASE() = insectopia_test` y se aplicó V11 únicamente allí. `MensajesNotificacionesMySqlIntegrationTests` probó persistencia, desempate de mensajes con la misma fecha, independencia de estados y rollback. Prueba manual con las dos cuentas reales: **no ejecutada**.

Verificación: suite completa de Maven en `insectopia_test`: **224 pruebas, 0 fallos, 0 errores, 1 omitida**. `mvnw.cmd -q -DskipTests package` correcto. No hay tarea de lint Java configurada en `pom.xml`.
