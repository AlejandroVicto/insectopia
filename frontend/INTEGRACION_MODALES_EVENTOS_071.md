# Modales de Eventos 071 — integración frontend (sin escrituras backend)

## 1. Resumen

Se integraron los cinco modales Desktop de Eventos en `/app/eventos`, reutilizando `ModalContainer`, `CampoModal`, los estilos oscuros existentes y una única gestión de modal activo en `Eventos.jsx`. También se aplicaron las correcciones pendientes de la 069. Los modales están funcionales como interfaz, validan y bloquean envíos duplicados, pero **no simulan guardado**: como no existen los endpoints 070/072, `eventosService.js` rechaza las operaciones con un mensaje informativo y no llama a Axios.

## 2. Lectura Figma

`figma-export/modales-eventos-071.txt` se leyó completamente: 950 líneas y 69.958 bytes. Se revisaron las secciones «Proponer Evento o Bioblitz», «Confirmar Participación e Inscripción» y «Rechazar Evento con Motivo». La última se tomó sólo como referencia visual del bloque de motivo; **no se implementó acción administrativa de rechazo**. También se revisó de nuevo `figma-export/eventos-069.txt` (775 líneas) como referencia de la pantalla principal. No se modificó ningún archivo de `figma-export/`.

Se conservaron del diseño la paleta oscura, el acento lima, el eyebrow superior, el icono en cabecera, el ancho de 768 px del formulario, el scroll interno, el resumen de evento y el pie con acciones. Se descartaron los campos visuales que no existen en `Evento.java`: taxones objetivo, tipo de iniciativa, franja operativa, GPS, mapa, permiso PDF, roles científicos, equipo obligatorio y consentimiento persistente.

## 3. Archivos creados

- `src/components/eventos/ProponerEventoModal.jsx`
- `src/components/eventos/EditarEventoModal.jsx`
- `src/components/eventos/EventoDetallesModal.jsx`
- `src/components/eventos/ConfirmarInscripcionModal.jsx`
- `src/components/eventos/CancelarInscripcionModal.jsx`
- `src/components/eventos/EventoFormulario.jsx`
- `src/components/eventos/EventoDetalleContenido.jsx`
- `src/components/eventos/EventoModalAviso.jsx`
- `src/components/eventos/eventosPermisos.js`
- `src/components/eventos/useEventoFormulario.js`
- `src/components/eventos/validarEvento.js`
- `src/components/eventos/EventosModales.test.jsx`
- `INTEGRACION_MODALES_EVENTOS_071.md`

## 4. Archivos modificados

- `src/pages/Eventos.jsx`: gestión centralizada `modal = { tipo, eventoId }`, conexión de los cinco botones/acciones y sustitución de los avisos 071.
- `src/pages/eventos.css`: rejilla de filtros de cuatro columnas, estilos de motivo de rechazo y estilos de modales.
- `src/components/modales/ModalContainer.jsx`: soporte opcional de `eyebrow`, `icon`, `acento`, `ancho` y `className` sin romper su API previa.
- `src/components/eventos/EventoCard.jsx`: callbacks `onEditar` y `onCancelarInscripcion`; permisos centralizados.
- `src/components/eventos/EventoDetalle.jsx`: mismo contenido compartido y nuevas acciones.
- `src/components/eventos/EventosFiltros.jsx`: se retiraron campos inexistentes.
- `src/adapters/eventosAdapter.js`: `motivoResolucion`, `esPropio` y propagación de opciones a la página.
- `src/data/eventosDemo.js`: fixtures ilustrativos con propiedad, motivo real e inscripción activa.
- `src/services/eventosService.js`: constantes y funciones de escritura pendientes, sin Axios; `tipo` y `modalidad` se retiraron también de los parámetros propuestos.
- `src/pages/Eventos.test.jsx`, `src/adapters/eventosAdapter.test.js`, `src/services/eventosService.test.js`, `src/components/modales/ModalContainer.test.jsx`: pruebas nuevas sin debilitar las anteriores.
- `INTEGRACION_EVENTOS_069.md`: correcciones 071 documentadas.

## 5. Correcciones 069

- Eliminados «Modalidad» y «Categoría / tipo» de `EventosFiltros.jsx` y de `FILTROS_PROPUESTOS`; el buscador ya no promete búsqueda por taxón.
- Eliminado el mensaje «Coordenadas GPS, mapa de monitoreo, equipo técnico y etiquetas taxonómicas…» de `EventoDetalle.jsx`.
- `motivoResolucion` se acepta en el adaptador y se muestra sólo si `estado === 'RECHAZADO'`, `esPropio === true` y el backend entrega texto real.
- `cupoMaximo` se conserva en tarjetas, detalle y modales; no se inventa `participantesConfirmados`.
- La rejilla de filtros pasó de 3 a 4 columnas.
- Las pestañas sin contrato siguen deshabilitadas/pendientes, sin resultados ficticios.

## 6. Estado de los cinco modales

| Modal | Estado | Comportamiento |
| --- | --- | --- |
| `ProponerEventoModal` | Implementado | Formulario compartido, validación, aviso de backend 070, altura determinista, scroll interno con espacio inferior y rechazo sin Axios. |
| `EditarEventoModal` | Implementado con guarda | Misma altura y scroll que Proponer; aviso 070 y resultado del guardado dentro del cuerpo desplazable, pie fijo. Sólo propuestas propias `PENDIENTE`; el resto muestra motivo y no editable. |
| `EventoDetallesModal` | Implementado | Ficha de sólo lectura con motivo condicionado. |
| `ConfirmarInscripcionModal` | Implementado con guarda | Aviso 072 y resultado del botón dentro del scroll, pie fijo; requiere checkbox, estado `APROBADO`, cupo real confirmado, no inscrito y no pasado. |
| `CancelarInscripcionModal` | Implementado con guarda | Aviso 072 y resultado del botón dentro del scroll, pie fijo; requiere inscripción activa real y evento no pasado. |

«Rechazar Evento con Motivo» existe sólo en el Figma como referencia visual; no se creó un modal administrativo ni una acción de moderación.

## 7. Campos

Payload permitido, construido en `validarEvento.js`:

```json
{
  "titulo": "Bioblitz de polillas 2027",
  "descripcion": "Muestreo con sábanas de reflexión.",
  "ubicacion": "Sierra Sur, Oaxaca",
  "imagen": null,
  "fechaInicio": "2027-01-05T09:00:00",
  "fechaFin": "2027-01-07T18:00:00",
  "cupoMaximo": 30
}
```

Fechas locales `YYYY-MM-DDTHH:mm:ss`, sin `toISOString()` ni desplazamiento UTC. No se envían IDs, estado, moderador, fechas administrativas ni motivo. Campos prohibidos y ausentes del payload/UI: `tipo_evento`, `categoria`, `modalidad`, `taxones_objetivo`, `coordenadas_gps`, `mapa`, `rol_cientifico`, `equipo_tecnico`, `permiso_pdf`, `aceptacion_etica`.

## 8. Validaciones y accesibilidad

- Título obligatorio y ≤150 caracteres; ubicación obligatoria y ≤255; imagen opcional ≤500 con `http(s):` o ruta relativa; cupo entero >0.
- Fechas válidas, hora `HH:mm` y `fechaFin` estrictamente posterior a `fechaInicio`.
- Errores por campo con `role="alert"`, `aria-invalid` y `aria-describedby` mediante `describirCampo`.
- `ModalContainer` aporta `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, foco inicial con `data-modal-autofocus`, atrapado de Tab, Escape, cierre por overlay, bloqueo del fondo y restauración del foco.
- Los formularios usan `aria-busy`, deshabilitan controles durante el envío y bloquean doble envío con `enviandoRef`.
- `ProponerEventoModal` y `EditarEventoModal` fijan `min(88dvh,720px)` como altura; `ModalContainer` envuelve el contenido en un cuerpo flex `min-h-0`, y `EventoFormulario` mantiene el pie `shrink-0` fuera del área con `overflow-y-auto` y 48 px de padding inferior.
- Los avisos iniciales y los mensajes posteriores a «Enviar propuesta», «Guardar cambios», «Confirmar inscripción» y «Confirmar cancelación» se renderizan dentro del área desplazable (`data-evento-cuerpo`) con margen propio; nunca se sitúan entre el cuerpo y el pie (`data-evento-pie`). Así fechas, cupo e imagen no quedan tapados antes ni después de pulsar el botón.
- Textos de integración: propuesta y edición → backend de eventos (actividad 070); inscripción y cancelación → backend de participación en eventos (actividad 072). Ningún diálogo dice que falta implementar la 071.
- Confirmación de inscripción y cancelación dependen del backend; no hay decrementos ni cambios de estado locales. Los cuatro botones rechazan sin Axios y sin invocar `onSuccess`. El resto de modales conserva su altura previa porque no solicitan `alto`.

## 9. Endpoints

Endpoints de lectura propuestos por 069 y ya presentes en el servicio: `GET /api/eventos`, `GET /api/eventos/{id}` y `GET /api/eventos/mis-propuestas`. Hoy sólo se envían `page` y `size` porque `CONTRATO_FILTROS_CONFIRMADO = false`.

Escrituras 071/072: `OPERACIONES_EVENTOS_DISPONIBLES = false` y `ENDPOINTS_ESCRITURA_PROPUESTOS` con los cuatro valores en `null`. Las rutas que se documentan como **propuestas no confirmadas** son `POST /api/eventos`, `PATCH /api/eventos/{id}`, `POST /api/eventos/{id}/participantes/me` y `DELETE /api/eventos/{id}/participantes/me`. Ninguna está implementada ni llamada por el frontend.

## 10. Lint

`npm run lint` desde `frontend/`: **correcto**, sin errores ni advertencias.

## 11. Pruebas

`npm test -- --run` desde `frontend/`: **23 archivos, 251 pruebas, todas correctas**, incluidos los cuatro modales de Publicaciones que reutilizan `ModalContainer`. La baseline era 22 archivos/220 pruebas; se añadieron 31 pruebas y se actualizaron expectativas obsoletas sin eliminar aserciones. Cubren payload exacto, campos prohibidos, validación, doble envío, estados de carga, errores con `role="alert"`, foco/atrape/Escape/restauración, `open={false}`, permisos, motivo condicionado, ausencia de filtros inexistentes, altura opcional de `ModalContainer`, cuerpo desplazable de propuesta y edición, posición de los avisos 070/072 dentro del scroll antes y después de pulsar cada botón, pie fuera del área desplazable y no llamadas a Axios ni `onSuccess` en escrituras.

## 12. Build

`npm run build` desde `frontend/`: **correcto**. Genera `index-B0HDWd4e.js` de 527,15 kB y aviso no bloqueante de Vite de chunk >500 kB. No se introdujo code splitting nuevo.

## 13. Git status

`git status --short` desde la raíz muestra 16 archivos modificados (1 preexistente de backend y 15 de frontend, incluidas las dos memorias) y 13 archivos nuevos de esta fase (12 de código/pruebas y esta memoria). No se hizo staging, commit ni push.

## 14. application.properties

`backend/src/main/resources/application.properties` ya estaba modificado antes de la fase 071. No se tocó, no se restauró y no se incluyó en ninguna operación de Git.

## 15. MySQL, Flyway y backend 070/072

No se modificaron MySQL, entidades Java, repositorios, migraciones Flyway, controladores, DTOs ni `SecurityConfig`. La inspección confirmó que **no existe ningún endpoint HTTP de Evento o ParticipanteEvento**: sólo están las entidades, repositorios, migración `V6__crear_eventos.sql` y datos semilla. Por eso las escrituras quedan pendientes y la UI no afirma éxito.

## 16. Commit y push

No se ejecutaron `git pull`, `push`, `commit`, `reset`, `stash`, `git restore .` ni cambios de rama. La rama sigue siendo `main`.

## 17. Pasos de verificación visual

1. Desde `frontend/`, ejecutar `npm run dev` con `VITE_EVENTOS_MOCK=true` e iniciar sesión como `USUARIO`.
2. Abrir `/app/eventos` y comprobar Navbar/Sidebar únicos, tema oscuro y sin desbordes a 1366×768, 1440×900 y 1920×1080.
3. Pulsar «+ Proponer Evento»: revisar cabecera con icono/eyebrow, scroll interno, validaciones y aviso de indisponibilidad; cancelar y verificar que no se envía nada.
4. En «Mis propuestas», abrir «Editar» sobre la propuesta pendiente: comprobar precarga, cabecera y pie fijos, scroll interno y el aviso del backend 070 sin tapar fechas, cupo ni imagen. Pulsar «Guardar cambios» y verificar que el aviso informativo aparece dentro del área desplazable, con el diálogo abierto y el contador sin cambios.
5. Abrir «Ver detalles» de la propuesta rechazada propia y verificar el bloque «Motivo del rechazo»; abrir una ajena rechazada y verificar que no aparece.
6. En «Todos los eventos», pulsar «Inscribirme»: comprobar resumen, checkbox obligatorio, aviso del backend de participación 072 y que el cupo no cambia al cancelar; el aviso posterior al botón debe quedar dentro del scroll, no sobre el pie.
7. Avanzar a la página 2 y pulsar «Cancelar inscripción» sobre el evento con inscripción activa; verificar que el botón queda bloqueado cuando no hay inscripción.
8. Confirmar con Escape y con la «×» que se cierra el diálogo, se restaura el foco y se libera el scroll del fondo.
9. Repetir con `VITE_EVENTOS_MOCK=false`: sin backend 070 se debe ver el estado «Todavía no se pueden consultar los eventos», nunca datos demo ni escrituras.
