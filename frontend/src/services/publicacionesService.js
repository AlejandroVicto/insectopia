import api from './api'

const RUTA_PUBLICACIONES = '/api/publicaciones'

export function consultarPublicaciones({ page = 0, size = 10, q = '', feed = 'para-ti', filters = {}, signal } = {}) {
  return api.get(RUTA_PUBLICACIONES, {
    params: { page, size, feed, ...(q.trim() ? { q: q.trim() } : {}), ...filters },
    signal,
  })
}

// Escrituras pendientes de que el backend publique sus DTO/controller.
// Solo se envían campos que existen hoy en la entidad Publicacion: contenido y imagen (string).
// La imagen se acepta como URL/identificador ya resuelto; la carga de archivos necesita otro endpoint.
function idValido(id) {
  return id !== null && id !== undefined && id !== ''
}

export function crearPublicacion({ contenido, imagen, signal } = {}) {
  if (typeof contenido !== 'string' || !contenido.trim()) {
    return Promise.reject(new TypeError('El contenido de la publicación es obligatorio'))
  }
  const cuerpo = { contenido: contenido.trim() }
  if (typeof imagen === 'string' && imagen.trim()) cuerpo.imagen = imagen.trim()
  return api.post(RUTA_PUBLICACIONES, cuerpo, { signal })
}

// Preparación local para el futuro contrato multipart. NO se envía: el backend actual solo
// acepta `imagen` como cadena en JSON. El nombre del campo es una propuesta para acordar en 062.
export const CAMPO_IMAGEN_FORMDATA = 'imagen'

export function prepararFormDataPublicacion({ contenido = '', imagen } = {}) {
  if (!imagen || typeof imagen.name !== 'string') {
    throw new TypeError('Se requiere un archivo de imagen')
  }
  const datos = new FormData()
  datos.append('contenido', typeof contenido === 'string' ? contenido.trim() : '')
  datos.append(CAMPO_IMAGEN_FORMDATA, imagen, imagen.name)
  return datos
}

export function actualizarPublicacion(id, { contenido, imagen, signal } = {}) {
  if (!idValido(id)) {
    return Promise.reject(new TypeError('Se requiere el identificador de la publicación'))
  }
  if (typeof contenido !== 'string' || !contenido.trim()) {
    return Promise.reject(new TypeError('El contenido de la publicación es obligatorio'))
  }
  const cuerpo = { contenido: contenido.trim() }
  if (imagen !== undefined) cuerpo.imagen = imagen
  return api.put(`${RUTA_PUBLICACIONES}/${encodeURIComponent(String(id))}`, cuerpo, { signal })
}

export function eliminarPublicacion(id, { signal } = {}) {
  if (!idValido(id)) {
    return Promise.reject(new TypeError('Se requiere el identificador de la publicación'))
  }
  return api.delete(`${RUTA_PUBLICACIONES}/${encodeURIComponent(String(id))}`, { signal })
}
