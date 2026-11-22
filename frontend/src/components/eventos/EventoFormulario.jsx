import CampoModal from '../modales/CampoModal'
import {
  CLASE_BOTON_PRIMARIO,
  CLASE_BOTON_SECUNDARIO,
  CLASE_CONTROL,
  describirCampo,
} from '../../constants/modalesPublicaciones'
import { LIMITES_EVENTO } from './validarEvento'
import EventoModalAviso from './EventoModalAviso'

function Control({ id, valor, error, onChange, type = 'text', pista, ...props }) {
  return (
    <input
      id={id}
      type={type}
      value={valor}
      onChange={(evento) => onChange(id.split('--').at(-1), evento.target.value)}
      aria-invalid={Boolean(error)}
      aria-describedby={describirCampo(id, { error, pista })}
      className={CLASE_CONTROL}
      {...props}
    />
  )
}

export default function EventoFormulario({ idPrefix, form, modo = 'crear' }) {
  const {
    valores,
    errores,
    enviando,
    mensaje,
    mensajeTipo,
    confirmarDescarte,
    cambiar,
    solicitarCierre,
    confirmarSalida,
    seguirEditando,
    enviar,
  } = form

  const id = (campo) => `${idPrefix}--${campo}`
  const esCreacion = modo === 'crear'

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault()
        enviar()
      }}
      aria-busy={enviando}
      data-evento-formulario=""
      className="evt-formulario-modal flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <fieldset
        disabled={enviando}
        data-evento-cuerpo=""
        className="evt-modal-body evt-formulario-cuerpo min-h-0 flex-1 overflow-y-auto overscroll-contain border-0 px-6 pt-5 pb-12 sm:px-8"
      >
        <legend className="sr-only">{esCreacion ? 'Datos de la nueva propuesta' : 'Datos de la propuesta a editar'}</legend>

        <p role="status" className="mb-4 rounded-xl border border-[#466046] bg-[#26382a] px-4 py-3 text-xs leading-5 text-lime-100">
          {esCreacion
            ? 'El formulario está disponible para su revisión. El envío de propuestas se habilitará cuando esté integrado el backend de eventos (actividad 070).'
            : 'El formulario está disponible para su revisión. Los cambios podrán guardarse cuando esté integrado el backend de eventos (actividad 070).'}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <CampoModal
            id={id('titulo')}
            etiqueta="Título *"
            error={errores.titulo}
            pista={`Máximo ${LIMITES_EVENTO.titulo} caracteres.`}
            className="md:col-span-2"
          >
            <Control
              id={id('titulo')}
              valor={valores.titulo}
              error={errores.titulo}
              pista
              onChange={cambiar}
              maxLength={LIMITES_EVENTO.titulo}
              placeholder="Ej. Bioblitz nocturno Sierra Sur"
              data-modal-autofocus=""
            />
          </CampoModal>

          <CampoModal id={id('descripcion')} etiqueta="Descripción *" error={errores.descripcion} className="md:col-span-2">
            <textarea
              id={id('descripcion')}
              rows={4}
              value={valores.descripcion}
              onChange={(evento) => cambiar('descripcion', evento.target.value)}
              aria-invalid={Boolean(errores.descripcion)}
              aria-describedby={describirCampo(id('descripcion'), { error: errores.descripcion })}
              className={`${CLASE_CONTROL} resize-y`}
              placeholder="Describe las actividades, el objetivo y las condiciones de participación."
            />
          </CampoModal>

          <CampoModal
            id={id('ubicacion')}
            etiqueta="Ubicación *"
            error={errores.ubicacion}
            pista={`Máximo ${LIMITES_EVENTO.ubicacion} caracteres.`}
            className="md:col-span-2"
          >
            <Control
              id={id('ubicacion')}
              valor={valores.ubicacion}
              error={errores.ubicacion}
              pista
              onChange={cambiar}
              maxLength={LIMITES_EVENTO.ubicacion}
              placeholder="Localidad, reserva o punto de encuentro"
            />
          </CampoModal>

          <CampoModal id={id('fechaInicio')} etiqueta="Fecha de inicio *" error={errores.fechaInicio}>
            <Control
              id={id('fechaInicio')}
              type="date"
              valor={valores.fechaInicio}
              error={errores.fechaInicio}
              onChange={cambiar}
            />
          </CampoModal>

          <CampoModal id={id('horaInicio')} etiqueta="Hora de inicio *" error={errores.horaInicio}>
            <Control
              id={id('horaInicio')}
              type="time"
              valor={valores.horaInicio}
              error={errores.horaInicio}
              onChange={cambiar}
            />
          </CampoModal>

          <CampoModal id={id('fechaFin')} etiqueta="Fecha de finalización *" error={errores.fechaFin}>
            <Control
              id={id('fechaFin')}
              type="date"
              valor={valores.fechaFin}
              error={errores.fechaFin}
              onChange={cambiar}
            />
          </CampoModal>

          <CampoModal id={id('horaFin')} etiqueta="Hora de finalización *" error={errores.horaFin}>
            <Control
              id={id('horaFin')}
              type="time"
              valor={valores.horaFin}
              error={errores.horaFin}
              onChange={cambiar}
            />
          </CampoModal>

          <CampoModal id={id('cupoMaximo')} etiqueta="Cupo máximo *" error={errores.cupoMaximo}>
            <Control
              id={id('cupoMaximo')}
              type="number"
              min="1"
              step="1"
              valor={valores.cupoMaximo}
              error={errores.cupoMaximo}
              onChange={cambiar}
              placeholder="Ej. 30"
            />
          </CampoModal>

          <CampoModal
            id={id('imagen')}
            etiqueta="URL de imagen (opcional)"
            error={errores.imagen}
            pista={`http(s) o ruta relativa; hasta ${LIMITES_EVENTO.imagen} caracteres.`}
          >
            <Control
              id={id('imagen')}
              valor={valores.imagen}
              error={errores.imagen}
              pista
              onChange={cambiar}
              maxLength={LIMITES_EVENTO.imagen}
              placeholder="https://ejemplo.test/evento.jpg"
            />
          </CampoModal>
        </div>

        {confirmarDescarte && (
          <div className="evt-modal-descartar mt-5 rounded-xl border border-amber-400/40 bg-amber-950/30 px-4 py-3">
            <p className="text-xs leading-5 text-amber-100">Tienes cambios sin guardar. ¿Deseas descartarlos?</p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={seguirEditando} className={CLASE_BOTON_SECUNDARIO}>
                Seguir editando
              </button>
              <button type="button" onClick={confirmarSalida} className={CLASE_BOTON_PRIMARIO}>
                Descartar cambios
              </button>
            </div>
          </div>
        )}

        {mensaje && (
          <div data-evento-aviso="" className="mt-4">
            <EventoModalAviso mensaje={mensaje} tipo={mensajeTipo} />
          </div>
        )}
      </fieldset>

      <footer data-evento-pie="" className="evt-formulario-pie shrink-0 border-t border-[#35483a] bg-[#1d2820] px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={solicitarCierre} disabled={enviando} className={CLASE_BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className={CLASE_BOTON_PRIMARIO}>
            {enviando ? 'Guardando…' : esCreacion ? 'Enviar propuesta' : 'Guardar cambios'}
          </button>
        </div>
      </footer>
    </form>
  )
}
