import api from './api'

// Contrato PROPUESTO para la actividad 070. Todavía no existe controller ni DTO:
// sólo EventoRepository y las entidades Java. Hasta que el compañero confirme los
// parámetros, se envían exclusivamente page y size (nunca parámetros inventados).
export const RUTA_EVENTOS = '/api/eventos'
export const FILTROS_PROPUESTOS = Object.freeze(['q', 'estado', 'fechaDesde', 'fechaHasta'])
export const CONTRATO_FILTROS_CONFIRMADO = false

// Escrituras 071/072: hoy no hay controller ni DTO en el backend. Las funciones
// existen para conectar el contrato definitivo, pero NO llaman a Axios ni
// simulan éxito mientras no exista el endpoint.
export const OPERACIONES_EVENTOS_DISPONIBLES = false
export const ENDPOINTS_ESCRITURA_PROPUESTOS = Object.freeze({
  crear: null,
  editar: null,
  inscribir: null,
  cancelarInscripcion: null,
})

function operacionNoDisponible(mensaje) {
  return Promise.reject(Object.assign(new Error(mensaje), { userMessage: mensaje, tipo: 'info' }))
}

export function crearEvento() {
  return operacionNoDisponible('La propuesta estará disponible cuando se integre el servicio de eventos.')
}

export function actualizarEvento() {
  return operacionNoDisponible('La edición estará disponible cuando se integre el servicio de eventos.')
}

export function inscribirmeEnEvento() {
  return operacionNoDisponible('La inscripción estará disponible cuando se integre el servicio de participación (actividad 072).')
}

export function cancelarMiInscripcion() {
  return operacionNoDisponible('La cancelación estará disponible cuando se integre el servicio de participación (actividad 072).')
}

function texto(valor) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : ''
}

function fechaLocalISO(fecha) {
  const anio = String(fecha.getFullYear()).padStart(4, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
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

  // "Próximos y pasados" se traduce al contrato propuesto de fechas, nunca se
  // filtra en React. Las fechas explícitas tienen prioridad sobre el periodo.
  if (periodo === 'futuros' && !texto(fechaDesde)) parametros.fechaDesde = fechaLocalISO(new Date())
  if (periodo === 'pasados' && !texto(fechaHasta)) {
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    parametros.fechaHasta = fechaLocalISO(ayer)
  }
  if (texto(fechaDesde)) parametros.fechaDesde = texto(fechaDesde)
  if (texto(fechaHasta)) parametros.fechaHasta = texto(fechaHasta)
  return parametros
}

export function consultarEventos({ page = 0, size = 10, filtros = {}, signal } = {}) {
  return api.get(RUTA_EVENTOS, {
    params: construirParametrosEventos({ page, size, filtros }),
    signal,
  })
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
