import { useEffect, useRef, useState } from 'react'
import ModalContainer from '../modales/ModalContainer'
import DetalleReporte from './DetalleReporte'
import { mensajeErrorApi } from '../../services/erroresApi'
import {
  ESTADOS_RESOLUCION_REPORTE,
  LONGITUD_MAXIMA_RESOLUCION,
} from '../../services/reportesService'

export default function ResolverReporteModal({ reporte, onClose, onConfirm, onSuccess }) {
  const [paso, setPaso] = useState('formulario')
  const [estado, setEstado] = useState('RESUELTO')
  const [resolucion, setResolucion] = useState('')
  const [errorResolucion, setErrorResolucion] = useState('')
  const [errorServidor, setErrorServidor] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const confirmarRef = useRef(null)

  useEffect(() => {
    if (paso === 'confirmacion') confirmarRef.current?.focus()
  }, [paso])

  if (!reporte) return null

  function validar() {
    const limpio = resolucion.trim()
    if (!limpio) return 'La resolución es obligatoria.'
    if (limpio.length > LONGITUD_MAXIMA_RESOLUCION) {
      return `La resolución no puede superar los ${LONGITUD_MAXIMA_RESOLUCION} caracteres.`
    }
    return ''
  }

  function continuar(event) {
    event.preventDefault()
    const falloValidacion = validar()
    if (falloValidacion) {
      setErrorResolucion(falloValidacion)
      return
    }
    setErrorResolucion('')
    setErrorServidor('')
    setPaso('confirmacion')
  }

  async function confirmar() {
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setErrorServidor('')
    try {
      await onConfirm(reporte.id, { estado, resolucion: resolucion.trim() })
      await onSuccess?.()
      onClose?.()
    } catch (fallo) {
      setErrorServidor(mensajeErrorApi(fallo, 'No se pudo resolver el reporte.'))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <ModalContainer
      titleId="mod-resolver-titulo"
      descriptionId="mod-resolver-descripcion"
      title={paso === 'formulario' ? 'Resolver reporte' : 'Confirmar resolución'}
      description={paso === 'formulario'
        ? 'Revisa el motivo y registra la acción tomada sobre la publicación.'
        : 'Verifica la resolución antes de enviarla al backend.'}
      eyebrow="REPORTES · PUBLICACIONES"
      ancho={680}
      className="mod-modal"
      onClose={onClose}
      closeDisabled={enviando}
    >
      {paso === 'formulario' ? (
        <form onSubmit={continuar} className="mod-modal-form" noValidate>
          <div className="mod-modal-body">
            <DetalleReporte reporte={reporte} />
            <fieldset className="mod-opciones">
              <legend>Decisión</legend>
              {ESTADOS_RESOLUCION_REPORTE.map((opcion) => (
                <label key={opcion} className="mod-opcion">
                  <input
                    type="radio"
                    name="mod-estado-resolucion"
                    value={opcion}
                    checked={estado === opcion}
                    disabled={enviando}
                    onChange={() => setEstado(opcion)}
                    data-modal-autofocus={opcion === 'RESUELTO' ? '' : undefined}
                  />
                  <span>{opcion === 'RESUELTO' ? 'Resolver reporte' : 'Rechazar reporte'}</span>
                </label>
              ))}
            </fieldset>
            <label className="mod-campo mod-campo--modal" htmlFor="mod-resolucion-reporte">
              <span>Resolución <span aria-hidden="true">*</span></span>
              <textarea
                id="mod-resolucion-reporte"
                value={resolucion}
                maxLength={LONGITUD_MAXIMA_RESOLUCION}
                rows={4}
                disabled={enviando}
                aria-invalid={Boolean(errorResolucion)}
                aria-describedby={errorResolucion ? 'mod-resolucion-error' : 'mod-resolucion-ayuda'}
                onChange={(event) => {
                  setResolucion(event.target.value)
                  if (errorResolucion) setErrorResolucion('')
                }}
              />
            </label>
            <p id="mod-resolucion-ayuda" className="mod-ayuda">
              Entre 1 y {LONGITUD_MAXIMA_RESOLUCION} caracteres. Se notificará al reportante.
            </p>
            <p className="mod-contador">{resolucion.trim().length} / {LONGITUD_MAXIMA_RESOLUCION}</p>
            {errorResolucion && <p id="mod-resolucion-error" role="alert" className="mod-error-campo">{errorResolucion}</p>}
          </div>
          <footer className="mod-modal-pie">
            <button type="button" className="mod-btn mod-btn--secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="mod-btn mod-btn--primario">Continuar</button>
          </footer>
        </form>
      ) : (
        <div aria-busy={enviando} className="mod-modal-form">
          <div className="mod-modal-body">
            <DetalleReporte reporte={reporte} />
            <dl className="mod-confirmacion-resolucion">
              <div><dt>Decisión</dt><dd>{estado}</dd></div>
              <div><dt>Resolución</dt><dd>{resolucion.trim()}</dd></div>
            </dl>
            {errorServidor && <p role="alert" className="mod-error-servidor">{errorServidor}</p>}
          </div>
          <footer className="mod-modal-pie">
            <button type="button" className="mod-btn mod-btn--secundario" disabled={enviando} onClick={() => setPaso('formulario')}>Volver</button>
            <button type="button" className="mod-btn mod-btn--secundario" disabled={enviando} onClick={onClose}>Cancelar</button>
            <button
              type="button"
              ref={confirmarRef}
              className={`mod-btn ${estado === 'RECHAZADO' ? 'mod-btn--peligro' : 'mod-btn--primario'}`}
              disabled={enviando}
              onClick={confirmar}
            >
              {enviando ? 'Guardando…' : 'Confirmar resolución'}
            </button>
          </footer>
        </div>
      )}
    </ModalContainer>
  )
}
