import { useRef, useState } from 'react'
import { mensajeErrorApi } from '../../services/erroresApi'
import { construirPayloadEvento, validarEvento, valoresDesdeEvento } from './validarEvento'

// Estado compartido por los modales de propuesta y edición: valida, bloquea
// envíos duplicados y pide confirmación antes de descartar cambios.
export default function useEventoFormulario({
  inicial,
  onClose,
  onGuardar,
  onSuccess,
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

  const sucio = JSON.stringify(valores) !== JSON.stringify(valoresBase)

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

    const erroresValidacion = validarEvento(valores)
    setErrores(erroresValidacion)
    if (Object.values(erroresValidacion).some(Boolean)) return

    enviandoRef.current = true
    setEnviando(true)
    setMensaje('')
    setMensajeTipo('')

    try {
      await onGuardar?.(construirPayloadEvento(valores))
      await onSuccess?.(construirPayloadEvento(valores))
      onClose?.()
    } catch (error) {
      setMensaje(error?.userMessage || mensajeErrorApi(error, fallback))
      setMensajeTipo(error?.tipo === 'info' ? 'info' : 'error')
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return {
    valores,
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
