import api from './api'

// Contrato PROPUESTO para la actividad 070. Todavía no existe controller ni DTO:
// sólo EventoRepository y las entidades Java. Hasta que el compañero confirme los
// parámetros, se envían exclusivamente page y size (nunca parámetros inventados).
export const RUTA_EVENTOS = '/api/eventos'
export const FILTROS_PROPUESTOS = Object.freeze(['q', 'estado', 'fechaDesde', 'fechaHasta', 'tipo', 'modalidad'])
export const CONTRATO_FILTROS_CONFIRMADO = false

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

  const { q, estado, fechaDesde, fechaHasta, tipo, modalidad, periodo } = filtros
  if (texto(q)) parametros.q = texto(q)
  if (texto(estado)) parametros.estado = texto(estado).toUpperCase()
  if (texto(tipo)) parametros.tipo = texto(tipo)
  if (texto(modalidad)) parametros.modalidad = texto(modalidad)

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
