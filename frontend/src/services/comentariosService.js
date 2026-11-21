import api from './api'

const ruta = (idPublicacion) => `/api/publicaciones/${encodeURIComponent(String(idPublicacion))}/comentarios`

function idValido(id) {
  return id !== null && id !== undefined && id !== ''
}

export function listarComentarios(idPublicacion, { page = 0, size = 10, signal } = {}) {
  if (!idValido(idPublicacion)) {
    return Promise.reject(new TypeError('Se requiere la publicación para listar comentarios'))
  }
  return api.get(ruta(idPublicacion), { params: { page, size }, signal })
}

export function crearComentario(idPublicacion, { contenido, signal } = {}) {
  if (!idValido(idPublicacion)) {
    return Promise.reject(new TypeError('Se requiere la publicación para comentar'))
  }
  if (typeof contenido !== 'string' || !contenido.trim()) {
    return Promise.reject(new TypeError('El contenido del comentario es obligatorio'))
  }
  return api.post(ruta(idPublicacion), { contenido: contenido.trim() }, { signal })
}
