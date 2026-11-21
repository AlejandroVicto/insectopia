import api from './api'

const BASE = '/api/notificaciones'

function ruta(id) {
  if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('Identificador de notificación inválido')
  return `${BASE}/${id}`
}

export function listarNotificaciones({ page = 0, size = 10, filtro = 'todas', signal } = {}) {
  return api.get(BASE, { params: { page, size, filtro }, signal })
}

export function contarNoLeidas({ signal } = {}) {
  return api.get(`${BASE}/no-leidas/count`, { signal })
}

export function marcarLeida(id) {
  return api.patch(`${ruta(id)}/leer`)
}

export function marcarTodasLeidas() {
  return api.patch(`${BASE}/leer-todas`)
}

export function eliminarNotificacion(id) {
  return api.delete(ruta(id))
}
