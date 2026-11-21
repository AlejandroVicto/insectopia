import api from './api'

const ruta = (idPublicacion) => `/api/publicaciones/${encodeURIComponent(String(idPublicacion))}/reaccion`

function idValido(id) {
  return id !== null && id !== undefined && id !== ''
}

export function consultarEstadoReaccion(idPublicacion, { signal } = {}) {
  if (!idValido(idPublicacion)) {
    return Promise.reject(new TypeError('Se requiere la publicación para consultar la reacción'))
  }
  return api.get(ruta(idPublicacion), { signal })
}

export function reaccionar(idPublicacion, { signal } = {}) {
  if (!idValido(idPublicacion)) {
    return Promise.reject(new TypeError('Se requiere la publicación para reaccionar'))
  }
  return api.post(ruta(idPublicacion), undefined, { signal })
}

export function quitarReaccion(idPublicacion, { signal } = {}) {
  if (!idValido(idPublicacion)) {
    return Promise.reject(new TypeError('Se requiere la publicación para quitar la reacción'))
  }
  return api.delete(ruta(idPublicacion), { signal })
}
