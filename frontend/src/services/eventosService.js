import api from './api'
import { prepararFormDataPublicacion } from './publicacionesService'

export const RUTA_EVENTOS = '/api/eventos'
export const FILTROS_PROPUESTOS = Object.freeze(['q', 'estado', 'periodo', 'fechaDesde', 'fechaHasta'])
export const CONTRATO_FILTROS_CONFIRMADO = true

export const OPERACIONES_EVENTOS_DISPONIBLES = true
export const ENDPOINTS_ESCRITURA_PROPUESTOS = Object.freeze({
  crear: RUTA_EVENTOS,
  editar: `${RUTA_EVENTOS}/{id}`,
  inscribir: `${RUTA_EVENTOS}/{id}/participantes/me`,
  cancelarInscripcion: `${RUTA_EVENTOS}/{id}/participantes/me`,
})

export function operacionDemo(mensaje = 'La vista de demostración es de solo lectura.') {
  return Promise.reject(Object.assign(new Error(mensaje), { userMessage: mensaje, tipo: 'info' }))
}

export function crearEvento(datos) {
  return api.post(RUTA_EVENTOS, datos)
}

export function actualizarEvento(id, datos) {
  if (!idValido(id)) return Promise.reject(new TypeError('Se requiere el identificador del evento'))
  return api.patch(`${RUTA_EVENTOS}/${encodeURIComponent(String(id))}`, datos)
}

export function subirImagenEvento(id, imagen, { signal } = {}) {
  if (!idValido(id)) return Promise.reject(new TypeError('Se requiere el identificador del evento'))
  let datos
  try {
    datos = prepararFormDataPublicacion({ imagen })
  } catch (error) {
    return Promise.reject(error)
  }
  return api.post(`${RUTA_EVENTOS}/${encodeURIComponent(String(id))}/imagen`, datos, {
    signal, headers: { 'Content-Type': undefined },
  })
}

export function quitarImagenEvento(id, { signal } = {}) {
  if (!idValido(id)) return Promise.reject(new TypeError('Se requiere el identificador del evento'))
  return api.delete(`${RUTA_EVENTOS}/${encodeURIComponent(String(id))}/imagen`, { signal })
}

export function inscribirmeEnEvento(id) {
  if (!idValido(id)) return Promise.reject(new TypeError('Se requiere el identificador del evento'))
  return api.post(`${RUTA_EVENTOS}/${encodeURIComponent(String(id))}/participantes/me`)
}

export function cancelarMiInscripcion(id) {
  if (!idValido(id)) return Promise.reject(new TypeError('Se requiere el identificador del evento'))
  return api.delete(`${RUTA_EVENTOS}/${encodeURIComponent(String(id))}/participantes/me`)
}

function texto(valor) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : ''
}

function idValido(id) {
  return (typeof id === 'string' && id.trim().length > 0)
    || (Number.isSafeInteger(id) && id > 0)
}

export function construirParametrosEventos({
  page = 0,
  size = 10,
  filtros = {},
  incluirFiltrosPropuestos = CONTRATO_FILTROS_CONFIRMADO,
} = {}) {
  const parametros = { page, size }
  if (!incluirFiltrosPropuestos) return parametros

  const { q, estado, fechaDesde, fechaHasta, periodo } = filtros
  if (texto(q)) parametros.q = texto(q)
  if (texto(estado)) parametros.estado = texto(estado).toUpperCase()

  if (periodo === 'futuros' || periodo === 'pasados') parametros.periodo = periodo
  if (texto(fechaDesde)) parametros.fechaDesde = texto(fechaDesde)
  if (texto(fechaHasta)) parametros.fechaHasta = texto(fechaHasta)
  return parametros
}

export function consultarEventos({ page = 0, size = 10, filtros = {}, proximos = false, signal } = {}) {
  return api.get(RUTA_EVENTOS, {
    params: { ...construirParametrosEventos({ page, size, filtros }), ...(proximos ? { proximos: true } : {}) },
    signal,
  })
}

export function buscarEventosPorTitulo({ q, limite = 5, signal } = {}) {
  return api.get(`${RUTA_EVENTOS}/buscar`, { params: { q, limite }, signal })
}

export function consultarEvento(id, { signal } = {}) {
  if (!idValido(id)) return Promise.reject(new TypeError('Se requiere el identificador del evento'))
  return api.get(`${RUTA_EVENTOS}/${encodeURIComponent(String(id))}`, { signal })
}

export function consultarMisPropuestas({ page = 0, size = 10, filtros = {}, signal } = {}) {
  return api.get(`${RUTA_EVENTOS}/mis-propuestas`, {
    params: construirParametrosEventos({ page, size, filtros }),
    signal,
  })
}

export function consultarMisParticipaciones({ page = 0, size = 10, filtros = {}, signal } = {}) {
  return api.get(`${RUTA_EVENTOS}/mis-participaciones`, {
    params: construirParametrosEventos({ page, size, filtros }),
    signal,
  })
}
