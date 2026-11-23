import { useEffect, useRef, useState } from 'react'
import { mensajeErrorApi } from '../../services/erroresApi'
import { subirImagenEvento, quitarImagenEvento } from '../../services/eventosService'
import { LIMITES, TIPOS_IMAGEN_ACEPTADOS } from '../../constants/modalesPublicaciones'
import { construirPayloadEvento, validarEvento, valoresDesdeEvento } from './validarEvento'

// Estado compartido por los modales de propuesta y edición: valida, bloquea
// envíos duplicados y pide confirmación antes de descartar cambios.
export default function useEventoFormulario({
  inicial,
  onClose,
  onGuardar,
  onSuccess,
  onSubirImagen = subirImagenEvento,
  onQuitarImagen = quitarImagenEvento,
  fallback = 'No se pudo guardar la propuesta. Inténtalo de nuevo.',
}) {
  const [valores, setValores] = useState(() => valoresDesdeEvento(inicial))
  const [valoresBase] = useState(() => valoresDesdeEvento(inicial))
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mensajeTipo, setMensajeTipo] = useState('')
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const enviandoRef = useRef(false)
  const imagenInputRef = useRef(null)
  const [imagen, setImagen] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [tieneImagen, setTieneImagen] = useState(Boolean(inicial?.imagenUrl))
  const [guardada, setGuardada] = useState(null)

  useEffect(() => () => {
    if (vistaPrevia && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(vistaPrevia)
  }, [vistaPrevia])

  function cambiarImagen(evento) {
    const archivo = evento.target.files?.[0] ?? null
    if (!archivo) return
    const error = !TIPOS_IMAGEN_ACEPTADOS.includes(archivo.type)
      ? 'Solo se admiten imágenes JPG o PNG.'
      : archivo.size > LIMITES.imagenMaxBytes ? 'La imagen no puede superar los 5 MB.' : ''
    setErrores((previo) => ({ ...previo, imagen: error }))
    setMensaje('')
    if (error) {
      if (imagenInputRef.current) imagenInputRef.current.value = ''
      return
    }
    setImagen(archivo)
    setVistaPrevia(typeof URL.createObjectURL === 'function' ? URL.createObjectURL(archivo) : null)
  }

  function quitarSeleccion() {
    setImagen(null)
    setVistaPrevia(null)
    setErrores((previo) => ({ ...previo, imagen: '' }))
    setMensaje('')
    if (imagenInputRef.current) imagenInputRef.current.value = ''
  }

  async function quitarImagenActual() {
    if (!inicial?.id || enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setMensaje('')
    try {
      await onQuitarImagen(inicial.id)
      setTieneImagen(false)
      quitarSeleccion()
      await onSuccess?.({ ...inicial, imagenUrl: null })
    } catch (error) {
      setMensaje(error?.userMessage || mensajeErrorApi(error, 'No se pudo quitar la fotografía.'))
      setMensajeTipo('error')
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  const sucio = Boolean(guardada || imagen || (inicial?.imagenUrl && !tieneImagen))
    || JSON.stringify(valores) !== JSON.stringify(valoresBase)

  function cambiar(campo, valor) {
    setValores((anterior) => ({ ...anterior, [campo]: valor }))
    setErrores((anterior) => ({ ...anterior, [campo]: '', fechaFin: campo === 'fechaFin' ? '' : anterior.fechaFin }))
    setMensaje('')
    setMensajeTipo('')
  }

  function solicitarCierre() {
    if (enviandoRef.current) return
    if (confirmarDescarte) {
      onClose?.()
      return
    }
    if (sucio) {
      setConfirmarDescarte(true)
      return
    }
    onClose?.()
  }

  function confirmarSalida() {
    setConfirmarDescarte(false)
    onClose?.()
  }

  function seguirEditando() {
    setConfirmarDescarte(false)
  }

  async function enviar() {
    if (enviandoRef.current) return

    const erroresValidacion = guardada ? {} : validarEvento(valores)
    setErrores((previo) => ({ ...erroresValidacion, imagen: previo.imagen }))
    if (Object.values(erroresValidacion).some(Boolean) || errores.imagen) return

    enviandoRef.current = true
    setEnviando(true)
    setMensaje('')
    setMensajeTipo('')

    let confirmada = guardada
    const payload = construirPayloadEvento(valores)
    try {
      if (!confirmada) {
        const respuesta = await onGuardar?.(payload)
        confirmada = respuesta?.data ?? respuesta ?? null
        if (imagen && confirmada) setGuardada(confirmada)
        if (imagen && confirmada?.idEvento == null && confirmada?.id == null) {
          throw new Error('La respuesta no contiene el ID del evento; comprueba la propuesta antes de reintentar.')
        }
      }
      if (imagen) {
        try {
          const { data } = await onSubirImagen(confirmada.idEvento ?? confirmada.id, imagen)
          confirmada = data
        } catch (error) {
          // La escritura JSON ya se confirmó: refrescar y mantener el ID para reintentar únicamente el archivo.
          await onSuccess?.(confirmada ?? payload)
          if (error?.response?.status === 404 || error?.response?.status === 405) {
            error.userMessage = 'No se encontró la ruta de subida o el evento. Si acabas de actualizar el proyecto, reinicia el backend y reintenta la fotografía; el evento ya se guardó.'
          }
          throw error
        }
      }
      await onSuccess?.(imagen ? confirmada : payload)
      onClose?.()
    } catch (error) {
      setMensaje(error?.userMessage || mensajeErrorApi(error,
        guardada || (imagen && confirmada && (confirmada.idEvento != null || confirmada.id != null))
          ? 'El evento se guardó, pero no se pudo subir la fotografía. Reinténtala sin crear otro evento.' : fallback))
      setMensajeTipo(error?.tipo === 'info' ? 'info' : 'error')
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return {
    valores,
    imagen,
    vistaPrevia,
    tieneImagen,
    imagenActualUrl: inicial?.imagenUrl ?? null,
    eventoId: inicial?.id ?? null,
    guardada,
    imagenInputRef,
    cambiarImagen,
    quitarSeleccion,
    quitarImagenActual,
    errores,
    enviando,
    mensaje,
    mensajeTipo,
    confirmarDescarte,
    sucio,
    cambiar,
    solicitarCierre,
    confirmarSalida,
    seguirEditando,
    enviar,
  }
}
