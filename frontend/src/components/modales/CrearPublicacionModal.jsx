import { useEffect, useRef, useState } from 'react'
import CampoModal from './CampoModal'
import ModalContainer from './ModalContainer'
import { crearPublicacion, subirImagenPublicacion } from '../../services/publicacionesService'
import { mensajeErrorApi } from '../../services/erroresApi'
import {
  CLASE_AVISO,
  CLASE_BOTON_PRIMARIO,
  CLASE_BOTON_SECUNDARIO,
  CLASE_CONTROL,
  LIMITES,
  TIPOS_IMAGEN_ACEPTADOS,
  describirCampo,
} from '../../constants/modalesPublicaciones'

const IDS = {
  contenido: 'crear-contenido',
  imagen: 'crear-imagen',
}

function validarContenido(valor) {
  const texto = valor.trim()
  if (!texto) return 'Escribe tus notas de campo antes de publicar.'
  if (texto.length < LIMITES.contenidoMin) return `La descripción debe tener al menos ${LIMITES.contenidoMin} caracteres.`
  if (texto.length > LIMITES.contenidoMax) return `La descripción no puede superar ${LIMITES.contenidoMax} caracteres.`
  return ''
}

function validarImagen(archivo) {
  if (!archivo) return ''
  if (!TIPOS_IMAGEN_ACEPTADOS.includes(archivo.type)) {
    return 'Solo se admiten imágenes JPG o PNG. El formato RAW no está implementado.'
  }
  if (archivo.size > LIMITES.imagenMaxBytes) return 'La imagen no puede superar los 5 MB.'
  return ''
}

function CrearPublicacionForm({ onClose, onSuccess }) {
  const [contenido, setContenido] = useState('')
  const [imagen, setImagen] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [creada, setCreada] = useState(null)
  const enviandoRef = useRef(false)
  const imagenInputRef = useRef(null)

  useEffect(() => () => {
    if (vistaPrevia && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(vistaPrevia)
  }, [vistaPrevia])

  function cambiarImagen(event) {
    const archivo = event.target.files?.[0] ?? null
    const error = validarImagen(archivo)
    setErrores((actual) => ({ ...actual, imagen: error, envio: '' }))
    if (!archivo || error) {
      setImagen(null)
      setVistaPrevia(null)
      if (imagenInputRef.current) imagenInputRef.current.value = ''
      return
    }
    setImagen(archivo)
    setVistaPrevia(typeof URL.createObjectURL === 'function' ? URL.createObjectURL(archivo) : null)
  }

  function quitarImagen() {
    setImagen(null)
    setVistaPrevia(null)
    setErrores((actual) => ({ ...actual, imagen: '', envio: '' }))
    if (imagenInputRef.current) imagenInputRef.current.value = ''
  }

  function sustituirImagen() {
    imagenInputRef.current?.focus()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (enviandoRef.current) return

    const errorContenido = creada ? '' : validarContenido(contenido)
    setErrores((actual) => ({ ...actual, contenido: errorContenido, envio: '' }))
    if (errorContenido || errores.imagen) return

    enviandoRef.current = true
    setEnviando(true)
    let publicacion = creada
    try {
      if (!publicacion) {
        const { data } = await crearPublicacion({ contenido })
        if (data?.id == null) throw new Error('La respuesta de creación no contiene el ID de la publicación')
        publicacion = data
        setCreada(data)
      }
      if (imagen) {
        try {
          const { data } = await subirImagenPublicacion(publicacion.id, imagen)
          publicacion = data
        } catch (error) {
          // El POST JSON ya se confirmó: actualizar el feed y conservar el ID para reintentar.
          onSuccess?.(publicacion)
          throw error
        }
      }
      onSuccess?.(publicacion)
      onClose?.()
    } catch (error) {
      setErrores((actual) => ({ ...actual, envio: mensajeErrorApi(error,
        publicacion ? `La publicación #${publicacion.id} se guardó, pero no se pudo subir la fotografía. Puedes reintentar sin duplicarla.` : 'No se pudo publicar el hallazgo.') }))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <ModalContainer
      titleId="crear-publicacion-titulo"
      descriptionId="crear-publicacion-descripcion"
      title="Registrar observación"
      description="Publica tu nuevo hallazgo entomológico en la red científica"
      onClose={onClose}
      closeLabel="Cerrar nueva publicación"
      closeDisabled={enviando}
    >
      <form onSubmit={handleSubmit} aria-busy={enviando} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
          {creada && <p role="status" className={CLASE_AVISO}>
            La publicación #{creada.id} ya se guardó. Si falló la fotografía, vuelve a intentar subirla sin crear otra publicación.
          </p>}

          <CampoModal
            id={IDS.contenido}
            etiqueta="Notas de campo y morfología"
            error={errores.contenido}
            pista={`${LIMITES.contenidoMin} caracteres mínimo · ${LIMITES.contenidoMax} máximo`}
          >
            <textarea
              id={IDS.contenido}
              data-modal-autofocus=""
              value={contenido}
              onChange={(event) => {
                setContenido(event.target.value)
                if (errores.contenido) setErrores((actual) => ({ ...actual, contenido: '' }))
              }}
              rows={5}
              maxLength={LIMITES.contenidoMax}
              disabled={enviando || Boolean(creada)}
              aria-invalid={Boolean(errores.contenido)}
              aria-describedby={describirCampo(IDS.contenido, { error: errores.contenido, pista: true })}
              placeholder="¿Qué espécimen o hallazgo observaste hoy? Describe el microhábitat, la planta nutricia y el comportamiento…"
              className={`${CLASE_CONTROL} resize-y`}
            />
          </CampoModal>

          <CampoModal
            id={IDS.imagen}
            etiqueta="Captura macro o micrografía (opcional)"
            error={errores.imagen}
            pista="JPG o PNG · máximo 5 MB · sin RAW ni extracción EXIF automática"
          >
            <input
              id={IDS.imagen}
              ref={imagenInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={cambiarImagen}
              disabled={enviando}
              aria-invalid={Boolean(errores.imagen)}
              aria-describedby={describirCampo(IDS.imagen, { error: errores.imagen, pista: true })}
              className={`${CLASE_CONTROL} file:mr-3 file:rounded-lg file:border-0 file:bg-[#35423a] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#f3f8ef]`}
            />
          </CampoModal>

          {imagen && <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={enviando} onClick={sustituirImagen} className={CLASE_BOTON_SECUNDARIO}>Sustituir imagen</button>
            <button type="button" disabled={enviando} onClick={quitarImagen} className={CLASE_BOTON_SECUNDARIO}>Quitar imagen</button>
          </div>}
          {vistaPrevia && <img src={vistaPrevia} alt={`Vista previa de ${imagen?.name ?? 'la imagen'}`} className="max-h-48 w-full rounded-xl object-contain" />}
          {imagen && !creada && <p role="status" className={CLASE_AVISO}>Primero se guardará el texto y después se subirá la fotografía JPG o PNG.</p>}

        </div>

        <footer className="shrink-0 border-t border-[#35483a] px-6 py-4 sm:px-8">
          {errores.envio && <div role="alert" className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs leading-5 text-red-200">{errores.envio}</div>}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" disabled={enviando} onClick={onClose} className={CLASE_BOTON_SECUNDARIO}>Cancelar</button>
            <button type="submit" disabled={enviando} className={CLASE_BOTON_PRIMARIO}>
              {enviando ? 'Publicando…' : creada && imagen ? 'Reintentar fotografía' : creada ? 'Terminar sin fotografía' : 'Publicar hallazgo'}
            </button>
          </div>
        </footer>
      </form>
    </ModalContainer>
  )
}

// Montar el formulario solo mientras está abierto garantiza que se reinicie al volver a abrirlo.
export default function CrearPublicacionModal({ open = true, ...props }) {
  return open ? <CrearPublicacionForm {...props} /> : null
}
