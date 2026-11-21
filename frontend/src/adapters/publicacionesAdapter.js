function optionalText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

function imagenUrl(value) {
  const ruta = optionalText(value)
  if (!ruta?.startsWith('/api/publicaciones/') || !import.meta.env.VITE_API_URL) return ruta
  try {
    return new URL(ruta, import.meta.env.VITE_API_URL).href
  } catch {
    return ruta
  }
}

export function adaptarPublicacion(raw) {
  const id = raw?.id ?? raw?.idPublicacion
  const source = raw?.autor ?? raw?.usuario
  const autorId = source?.id ?? source?.idUsuario
  const nombre = optionalText(source?.nombre ?? source?.name)
  const nombreUsuario = optionalText(source?.nombreUsuario)
  const contenido = optionalText(raw?.contenido)
  if ((typeof id !== 'string' && typeof id !== 'number') || !nombre || !nombreUsuario || !contenido || autorId == null) {
    throw new Error('El DTO de publicación no contiene los datos mínimos del feed')
  }
  const fecha = optionalText(raw.fechaPublicacion)
  return {
    id, autor: { id: autorId, nombre, nombreUsuario, avatarUrl: optionalText(source.avatarUrl ?? source.fotoPerfil) },
    titulo: optionalText(raw.titulo), contenido, imagenUrl: imagenUrl(raw.imagenUrl ?? raw.imagen),
    imagenAlt: optionalText(raw.imagenAlt),
    fechaPublicacion: fecha && !Number.isNaN(Date.parse(fecha)) ? fecha : null,
    totalComentarios: count(raw.totalComentarios), totalReacciones: count(raw.totalReacciones),
    reaccionUsuario: optionalText(raw.reaccionUsuario), estado: optionalText(raw.estado),
  }
}

export function adaptarPaginaPublicaciones(raw) {
  if (!raw || !Array.isArray(raw.content) || !Number.isInteger(raw.number) || raw.number < 0
      || !Number.isInteger(raw.size) || raw.size <= 0 || !Number.isInteger(raw.totalPages)
      || raw.totalPages < 0 || !Number.isInteger(raw.totalElements) || raw.totalElements < 0
      || typeof raw.first !== 'boolean' || typeof raw.last !== 'boolean') {
    throw new Error('El formato de paginación no es válido')
  }
  return { content: raw.content.map(adaptarPublicacion), number: raw.number, size: raw.size,
    totalPages: raw.totalPages, totalElements: raw.totalElements, first: raw.first, last: raw.last }
}
