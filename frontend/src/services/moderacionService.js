import api from './api'

// Contrato publicado en backend/INTEGRACION_MODERACION_086.md.
// No se agregan rutas propias de reportes: ésas viven en reportesService.js.
export const RUTA_PROPUESTAS_MODERACION = '/api/moderacion/eventos/propuestas'
export const ESTADOS_PROPUESTA_MODERABLES = Object.freeze(['PENDIENTE', 'APROBADO', 'RECHAZADO'])
export const LONGITUD_MAXIMA_MOTIVO = 500

function texto(valor) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : ''
}

function idValido(id) {
  return (typeof id === 'string' && id.trim().length > 0)
    || (Number.isSafeInteger(id) && id > 0)
}

function rejection(mensaje) {
  return Promise.reject(Object.assign(new TypeError(mensaje), { userMessage: mensaje }))
}

export function listarPropuestas({
  page = 0,
  size = 20,
  q = '',
  estado = 'PENDIENTE',
  fechaDesde = '',
  fechaHasta = '',
  signal,
} = {}) {
  const parametros = { page, size }
  const termino = texto(q)
  const estadoModerable = texto(estado).toUpperCase()
  const desde = texto(fechaDesde)
  const hasta = texto(fechaHasta)

  if (termino) parametros.q = termino.slice(0, 100)
  if (ESTADOS_PROPUESTA_MODERABLES.includes(estadoModerable)) parametros.estado = estadoModerable
  if (desde) parametros.fechaDesde = desde
  if (hasta) parametros.fechaHasta = hasta

  return api.get(RUTA_PROPUESTAS_MODERACION, { params: parametros, signal })
}

export function aprobarPropuesta(id) {
  if (!idValido(id)) return rejection('Se requiere el identificador de la propuesta')
  return api.patch(`/api/moderacion/eventos/${encodeURIComponent(String(id).trim())}/aprobar`)
}

export function rechazarPropuesta(id, motivo) {
  if (!idValido(id)) return rejection('Se requiere el identificador de la propuesta')
  const motivoLimpio = texto(motivo)
  if (!motivoLimpio) return rejection('El motivo del rechazo es obligatorio')
  if (motivoLimpio.length > LONGITUD_MAXIMA_MOTIVO) {
    return rejection(`El motivo no puede superar los ${LONGITUD_MAXIMA_MOTIVO} caracteres`)
  }
  return api.patch(`/api/moderacion/eventos/${encodeURIComponent(String(id).trim())}/rechazar`, {
    motivo: motivoLimpio,
  })
}
