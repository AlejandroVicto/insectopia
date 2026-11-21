import { useRef, useState } from 'react'
import CampoModal from './CampoModal'
import ModalContainer from './ModalContainer'
import { crearReporte } from '../../services/reportesService'
import { mensajeErrorApi } from '../../services/erroresApi'
import {
  CLASE_AVISO,
  CLASE_BOTON_PRIMARIO,
  CLASE_BOTON_SECUNDARIO,
  CLASE_CONTROL,
  LIMITES,
  MOTIVOS_REPORTE,
  describirCampo,
} from '../../constants/modalesPublicaciones'

const IDS = {
  motivo: 'reportar-motivo',
  descripcion: 'reportar-descripcion',
}

function validarDescripcion(valor) {
  const texto = valor.trim()
  if (!texto) return 'Describe el problema para que el equipo de moderación pueda revisarlo.'
  if (texto.length < LIMITES.descripcionMin) return `La descripción debe tener al menos ${LIMITES.descripcionMin} caracteres.`
  if (texto.length > LIMITES.descripcionMax) return `La descripción no puede superar ${LIMITES.descripcionMax} caracteres.`
  return ''
}

function ReportarPublicacionForm({ publicacion, onClose, onSuccess }) {
  const [motivo, setMotivo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (enviandoRef.current) return

    const errorMotivo = motivo ? '' : 'Selecciona un motivo para el reporte.'
    const errorDescripcion = validarDescripcion(descripcion)
    setErrores({ motivo: errorMotivo, descripcion: errorDescripcion, envio: '' })
    if (errorMotivo || errorDescripcion) return

    enviandoRef.current = true
    setEnviando(true)
    try {
      const { data } = await crearReporte({
        publicacionId: publicacion?.id ?? publicacion?.idPublicacion,
        motivo,
        descripcion,
      })
      onSuccess?.(data, publicacion)
      onClose?.()
    } catch (error) {
      setErrores((actual) => ({ ...actual, envio: mensajeErrorApi(error, 'No se pudo enviar el reporte.') }))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <ModalContainer
      titleId="reportar-publicacion-titulo"
      descriptionId="reportar-publicacion-descripcion"
      title="Reportar publicación"
      description="Ayuda a mantener segura la comunidad"
      onClose={onClose}
      closeLabel="Cerrar reporte"
      closeDisabled={enviando}
    >
      <form onSubmit={handleSubmit} aria-busy={enviando} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
          <p className={CLASE_AVISO}>El reporte se registrará cuando el backend confirme el envío.</p>
          <p className={CLASE_AVISO}>Cuando esté disponible, tu reporte será revisado por el equipo de moderación.</p>
          <p className="text-xs text-[#a5b7a7]">Publicación reportada: {String(publicacion?.id ?? publicacion?.idPublicacion ?? 'no disponible')}</p>

          <CampoModal id={IDS.motivo} etiqueta="Motivo del reporte" error={errores.motivo}>
            <select
              id={IDS.motivo}
              data-modal-autofocus=""
              value={motivo}
              onChange={(event) => {
                setMotivo(event.target.value)
                if (errores.motivo) setErrores((actual) => ({ ...actual, motivo: '' }))
              }}
              disabled={enviando}
              aria-invalid={Boolean(errores.motivo)}
              aria-describedby={describirCampo(IDS.motivo, { error: errores.motivo })}
              className={CLASE_CONTROL}
            >
              <option value="">Selecciona un motivo…</option>
              {MOTIVOS_REPORTE.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
            </select>
          </CampoModal>

          <CampoModal
            id={IDS.descripcion}
            etiqueta="Descripción del problema"
            error={errores.descripcion}
            pista={`${LIMITES.descripcionMin} caracteres mínimo · ${LIMITES.descripcionMax} máximo`}
          >
            <textarea
              id={IDS.descripcion}
              value={descripcion}
              onChange={(event) => {
                setDescripcion(event.target.value)
                if (errores.descripcion) setErrores((actual) => ({ ...actual, descripcion: '' }))
              }}
              rows={4}
              maxLength={LIMITES.descripcionMax}
              disabled={enviando}
              aria-invalid={Boolean(errores.descripcion)}
              aria-describedby={describirCampo(IDS.descripcion, { error: errores.descripcion, pista: true })}
              placeholder="Explica por qué este contenido debe revisarse."
              className={`${CLASE_CONTROL} resize-y`}
            />
          </CampoModal>

          <p className="text-xs leading-5 text-[#a5b7a7]">No incluyas información personal. Los reportes no se publican en el feed.</p>
        </div>

        <footer className="shrink-0 border-t border-[#35483a] px-6 py-4 sm:px-8">
          {errores.envio && <div role="alert" className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs leading-5 text-red-200">{errores.envio}</div>}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" disabled={enviando} onClick={onClose} className={CLASE_BOTON_SECUNDARIO}>Cancelar</button>
            <button type="submit" disabled={enviando} className={CLASE_BOTON_PRIMARIO}>
              {enviando ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </footer>
      </form>
    </ModalContainer>
  )
}

export default function ReportarPublicacionModal({ open = true, ...props }) {
  return open ? <ReportarPublicacionForm {...props} /> : null
}
