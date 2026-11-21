# Colección Bruno — actividad 060

Colección mínima nueva (no existía otra en el repositorio) para comprobar los endpoints con JWT.

1. Abrir `backend/bruno` como colección en Bruno.
2. Seleccionar el entorno `Local` (`baseUrl=http://localhost:8080`).
3. Obtener un token con `POST /api/auth/login` (usuario real o demo solo en desarrollo) y copiar el `token` en la variable secreta `token` del entorno.
4. Ejecutar las peticiones en orden. La segunda llamada a `07-reaccionar.bru` debe devolver `409` con `details[0].field = "publicacionId"`.

Ajustar los identificadores `1` de las rutas a publicaciones existentes en la base de pruebas. Esta colección **no se ejecutó** durante la implementación: el MySQL local no estaba disponible.

## Mensajes 064

Peticiones `09` a `14` cubren bandeja, historial, envío, un tercero ajeno (leer/enviar) y ausencia de JWT.

1. Obtener dos tokens de cuentas demo participantes de una conversación existente y uno de una cuenta ajena; copiarlos en `token` y `tokenTercero` del entorno `Local` (variables secretas). Ajustar `conversacionId`.
2. `09` debe listar solo conversaciones del participante; `10` devuelve la página 0 con los mensajes más recientes; `11` debe responder `201` con `remitenteId` igual al usuario de `token` (nunca al del cuerpo).
3. `12` y `13` deben responder `403` (o `404`) con el token de un tercero; `14` debe responder `401` sin token.
4. No pegar tokens ni mensajes privados en la documentación ni en logs; la variable `conversacionId` apunta a datos de desarrollo.
5. Estas peticiones se validaron mediante comprobaciones HTTP equivalentes (20/20 correctas) contra el esquema demo `insectopia_modelo_nuevo`; no se ejecutaron desde la UI de Bruno. `11` inserta un mensaje nuevo en cada ejecución: usa solo datos de desarrollo y marca el contenido como `[064-PRUEBA]`. Ver `backend/INTEGRACION_064.md`.

## Gestión de conversaciones 066

Peticiones `15` a `23`:

1. Copiar los tokens de las cuentas demo en las variables secretas `token`, `tokenInterlocutor` y `tokenTercero`. Ajustar `seguidoId`, `noSeguidoId`, `yoId` y `conversacionId` a datos de desarrollo. **No versionar tokens ni contraseñas**.
2. `15`/`16` listan y buscan seguidos del `token`; `17` debe devolver `201` la primera vez, `18` debe devolver `200` al repetir; `19` debe devolver `403` si no sigues a `noSeguidoId`; `20` debe devolver `400` con `details[0].field = "destinatarioId"`.
3. `21` oculta la conversación solo para `token`; `22` (con `tokenInterlocutor`) debe seguir viéndola en la bandeja; `23` debe devolver `200` y hacerla reaparecer solo para `token`.
4. Si se quiere comprobar la reaparición por mensaje nuevo, ejecutar `11` con `tokenInterlocutor` y `conversacionId` de la conversación oculta: debe aparecer para `token`, sin desocultarla para `tokenInterlocutor` si este la había ocultado.
5. Estas peticiones se validaron mediante pruebas automáticas; no se ejecutaron desde la UI de Bruno ni contra un servidor levantado. Ver `backend/INTEGRACION_066.md`.
