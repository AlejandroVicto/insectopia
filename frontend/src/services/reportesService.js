import api from './api'

export const RUTA_REPORTES = '/api/reportes'
export const ESTADOS_REPORTE = Object.freeze(['PENDIENTE', 'EN_REVISION', 'RESUELTO', 'RECHAZADO'])
export const ESTADOS_RESOLUCION_REPORTE = Object.freeze(['RESUELTO', 'RECHAZADO'])
export const LONGITUD_MAXIMA_RESOLUCION = 500

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

export function crearReporte({ publicacionId, motivo, descripcion, signal } = {}) {
  if (publicacionId === null || publicacionId === undefined || publicacionId === '') {
    return Promise.reject(new TypeError('Se requiere la publicación a reportar'))
  }
  if (typeof motivo !== 'string' || !motivo.trim()) {
    return Promise.reject(new TypeError('El motivo del reporte es obligatorio'))
  }
  return api.post(RUTA_REPORTES, {
    publicacionId,
    motivo: motivo.trim(),
    descripcion: typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null,
  }, { signal })
}

export function listarReportes({ page = 0, size = 20, estado = '', signal } = {}) {
  const parametros = { page, size }
  const estadoValido = texto(estado).toUpperCase()
  if (ESTADOS_REPORTE.includes(estadoValido)) parametros.estado = estadoValido
  return api.get(RUTA_REPORTES, { params: parametros, signal })
}

export function resolverReporte(id, { estado, resolucion } = {}) {
  if (!idValido(id)) return rejection('Se requiere el identificador del reporte')
  const estadoValido = texto(estado).toUpperCase()
  if (!ESTADOS_RESOLUCION_REPORTE.includes(estadoValido)) {
    return rejection('La resolución debe ser RESUELTO o RECHAZADO')
  }
  const resolucionLimpia = texto(resolucion)
  if (!resolucionLimpia) return rejection('La resolución es obligatoria')
  if (resolucionLimpia.length > LONGITUD_MAXIMA_RESOLUCION) {
    return rejection(`La resolución no puede superar los ${LONGITUD_MAXIMA_RESOLUCION} caracteres`)
  }
  return api.patch(`${RUTA_REPORTES}/${encodeURIComponent(String(id).trim())}/resolver`, {
    estado: estadoValido,
    resolucion: resolucionLimpia,
  })
}
