import { useEffect, useRef, useState } from 'react'
import CampoModal from './CampoModal'
import ModalContainer from './ModalContainer'
import { actualizarPublicacion } from '../../services/publicacionesService'
import { mensajeErrorApi } from '../../services/erroresApi'
import {
  AVISO_IMAGEN,
  AVISO_PROPUESTA,
  CLASE_AVISO,
  CLASE_BOTON_PRIMARIO,
  CLASE_BOTON_SECUNDARIO,
  CLASE_CONTROL,
  LIMITES,
  TIPOS_IMAGEN_ACEPTADOS,
  describirCampo,
} from '../../constants/modalesPublicaciones'

const IDS = {
  contenido: 'editar-contenido',
  imagen: 'editar-imagen',
}

function validarContenido(valor) {
  const texto = valor.trim()
  if (!texto) return 'Escribe tus notas de campo antes de guardar.'
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

function resumen(publicacion) {
  const autor = publicacion?.autor?.nombre ?? 'Autor no disponible'
  return `Publicación ${publicacion?.id ?? 'sin identificador'} · ${autor}`
}

function EditarPublicacionForm({
  publicacion,
  puedeEditar = true,
  onClose,
  onSuccess,
}) {
  const contenidoInicial = publicacion?.contenido ?? ''
  const publicacionId = publicacion?.id ?? publicacion?.idPublicacion
  const [contenido, setContenido] = useState(contenidoInicial)
  const [imagen, setImagen] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

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
      return
    }
    setImagen(archivo)
    setVistaPrevia(typeof URL.createObjectURL === 'function' ? URL.createObjectURL(archivo) : null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (enviandoRef.current || !puedeEditar) return

    const errorContenido = validarContenido(contenido)
    setErrores((actual) => ({ ...actual, contenido: errorContenido, envio: '' }))
    if (errorContenido || errores.imagen || imagen) return

    enviandoRef.current = true
    setEnviando(true)
    try {
      const { data } = await actualizarPublicacion(publicacionId, { contenido })
      onSuccess?.(data, publicacion)
      onClose?.()
    } catch (error) {
      setErrores((actual) => ({ ...actual, envio: mensajeErrorApi(error, 'No se pudo guardar la publicación.') }))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <ModalContainer
      titleId="editar-publicacion-titulo"
      descriptionId="editar-publicacion-descripcion"
      title="Editar publicación"
      description="Modifica los detalles de tu observación"
      onClose={onClose}
      closeLabel="Cerrar edición"
      closeDisabled={enviando}
    >
      <form onSubmit={handleSubmit} aria-busy={enviando} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
          <p className={CLASE_AVISO}>{puedeEditar
            ? 'Solo el autor o un administrador autorizado puede modificar este contenido.'
            : 'No tienes autorización para editar esta publicación.'}</p>
          <p className={CLASE_AVISO}>La edición aún no está disponible en el backend: si intentas guardar verás el error real y no se modificará nada.</p>
          <p className="truncate text-xs text-[#a5b7a7]">{resumen(publicacion)}</p>
          <p className={CLASE_AVISO}>{AVISO_PROPUESTA}</p>

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
              disabled={!puedeEditar || enviando}
              aria-invalid={Boolean(errores.contenido)}
              aria-describedby={describirCampo(IDS.contenido, { error: errores.contenido, pista: true })}
              className={`${CLASE_CONTROL} resize-y`}
            />
          </CampoModal>

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoModal id="editar-orden" etiqueta="Orden taxonómico" pista="Propuesta de diseño · no editable">
              <input id="editar-orden" type="text" disabled className={CLASE_CONTROL} />
            </CampoModal>
            <CampoModal id="editar-ubicacion" etiqueta="Ubicación de muestreo" pista="Propuesta de diseño · no editable">
              <input id="editar-ubicacion" type="text" disabled className={CLASE_CONTROL} />
            </CampoModal>
          </div>

          <CampoModal
            id={IDS.imagen}
            etiqueta="Imagen actual · cambiar fotografía (JPG o PNG)"
            error={errores.imagen}
            pista={publicacion?.imagenUrl ? 'Ya hay una imagen adjunta en la publicación.' : 'Esta publicación no tiene imagen adjunta.'}
          >
            <input
              id={IDS.imagen}
              type="file"
              accept="image/jpeg,image/png"
              onChange={cambiarImagen}
              disabled={!puedeEditar || enviando}
              aria-invalid={Boolean(errores.imagen)}
              aria-describedby={describirCampo(IDS.imagen, { error: errores.imagen, pista: true })}
              className={`${CLASE_CONTROL} file:mr-3 file:rounded-lg file:border-0 file:bg-[#35423a] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#f3f8ef]`}
            />
          </CampoModal>

          {vistaPrevia && <img src={vistaPrevia} alt={`Vista previa de ${imagen?.name ?? 'la imagen'}`} className="max-h-48 w-full rounded-xl object-contain" />}
          {imagen && <p role="status" className={CLASE_AVISO}>{AVISO_IMAGEN} Quita el archivo para guardar solo el texto.</p>}
        </div>

        <footer className="shrink-0 border-t border-[#35483a] px-6 py-4 sm:px-8">
          {errores.envio && <div role="alert" className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs leading-5 text-red-200">{errores.envio}</div>}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" disabled={enviando} onClick={onClose} className={CLASE_BOTON_SECUNDARIO}>Cancelar</button>
            <button type="submit" disabled={!puedeEditar || enviando || Boolean(imagen)} className={CLASE_BOTON_PRIMARIO}>
              {enviando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </footer>
      </form>
    </ModalContainer>
  )
}

export default function EditarPublicacionModal({ open = true, ...props }) {
  return open ? <EditarPublicacionForm {...props} /> : null
}
