import api from './api'

const RUTA_PUBLICACIONES = '/api/publicaciones'

export function consultarPublicaciones({ page = 0, size = 10, q = '', feed = 'para-ti', filters = {}, signal } = {}) {
  return api.get(RUTA_PUBLICACIONES, {
    params: { page, size, feed, ...(q.trim() ? { q: q.trim() } : {}), ...filters },
    signal,
  })
}

function idValido(id) {
  return id !== null && id !== undefined && id !== ''
}

export function crearPublicacion({ contenido, imagen, signal } = {}) {
  if (imagen != null) {
    return Promise.reject(new TypeError('La fotografía debe subirse como archivo después de crear la publicación'))
  }
  if (typeof contenido !== 'string' || !contenido.trim()) {
    return Promise.reject(new TypeError('El contenido de la publicación es obligatorio'))
  }
  return api.post(RUTA_PUBLICACIONES, { contenido: contenido.trim() }, { signal })
}

export const CAMPO_IMAGEN_FORMDATA = 'imagen'

export function prepararFormDataPublicacion({ imagen } = {}) {
  if (!imagen || typeof imagen.name !== 'string') {
    throw new TypeError('Se requiere un archivo de imagen')
  }
  const datos = new FormData()
  datos.append(CAMPO_IMAGEN_FORMDATA, imagen, imagen.name)
  return datos
}

export function subirImagenPublicacion(id, imagen, { signal } = {}) {
  if (!idValido(id)) return Promise.reject(new TypeError('Se requiere el identificador de la publicación'))
  let datos
  try {
    datos = prepararFormDataPublicacion({ imagen })
  } catch (error) {
    return Promise.reject(error)
  }
  // El api compartido fija application/json; para FormData hay que retirar esa cabecera
  // y dejar que el navegador genere Content-Type con su boundary.
  return api.post(`${RUTA_PUBLICACIONES}/${encodeURIComponent(String(id))}/imagen`, datos, {
    signal,
    headers: { 'Content-Type': undefined },
  })
}

export function quitarImagenPublicacion(id, { signal } = {}) {
  if (!idValido(id)) return Promise.reject(new TypeError('Se requiere el identificador de la publicación'))
  return api.delete(`${RUTA_PUBLICACIONES}/${encodeURIComponent(String(id))}/imagen`, { signal })
}

export function actualizarPublicacion(id, { contenido, imagen, signal } = {}) {
  if (!idValido(id)) {
    return Promise.reject(new TypeError('Se requiere el identificador de la publicación'))
  }
  if (typeof contenido !== 'string' || !contenido.trim()) {
    return Promise.reject(new TypeError('El contenido de la publicación es obligatorio'))
  }
  if (imagen != null) {
    return Promise.reject(new TypeError('La fotografía debe subirse como archivo, no en el JSON de edición'))
  }
  return api.put(`${RUTA_PUBLICACIONES}/${encodeURIComponent(String(id))}`, { contenido: contenido.trim() }, { signal })
}

export function eliminarPublicacion(id, { signal } = {}) {
  if (!idValido(id)) {
    return Promise.reject(new TypeError('Se requiere el identificador de la publicación'))
  }
  return api.delete(`${RUTA_PUBLICACIONES}/${encodeURIComponent(String(id))}`, { signal })
}
