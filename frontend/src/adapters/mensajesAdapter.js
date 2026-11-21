const idValido = (id) => (typeof id === 'string' && id.trim()) || (Number.isSafeInteger(id) && id > 0)
const texto = (value) => typeof value === 'string' && value.trim() ? value.trim() : null
const fecha = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null

export function adaptarMensaje(raw) {
  const id = raw?.id ?? raw?.idMensaje
  const conversacionId = raw?.conversacionId
  const remitenteId = raw?.remitenteId
  if (!idValido(id) || !idValido(conversacionId) || !idValido(remitenteId)
      || !texto(raw?.contenido) || !fecha(raw?.fechaEnvio)) throw new Error('DTO de mensaje inválido')
  return { id, conversacionId, remitenteId, contenido: raw.contenido, fechaEnvio: raw.fechaEnvio,
    fechaLectura: fecha(raw.fechaLectura) }
}

export function adaptarConversacion(raw) {
  const id = raw?.id ?? raw?.idConversacion
  const persona = raw?.interlocutor
  if (!idValido(id) || !idValido(persona?.id) || !texto(persona?.nombre)
      || !texto(persona?.nombreUsuario) || !Number.isSafeInteger(raw?.noLeidos) || raw.noLeidos < 0) {
    throw new Error('DTO de conversación inválido')
  }
  const ultimo = raw.ultimoMensaje
  if (ultimo != null && (!idValido(ultimo.id) || !texto(ultimo.contenido) || !fecha(ultimo.fechaEnvio))) {
    throw new Error('Último mensaje inválido')
  }
  return { id, interlocutor: { id: persona.id, nombre: persona.nombre, nombreUsuario: persona.nombreUsuario,
    avatarUrl: texto(persona.avatarUrl), loSigo: typeof persona.loSigo === 'boolean' ? persona.loSigo : null },
  ultimoMensaje: ultimo ? { id: ultimo.id, contenido: ultimo.contenido, fechaEnvio: ultimo.fechaEnvio } : null,
  noLeidos: raw.noLeidos, oculta: raw.oculta === true }
}

// El listado del endpoint de seguidos nunca equivale a la bandeja de chats.
// loSigo:true explícito permite seleccionar; registros sin confirmación quedan deshabilitados.
export function adaptarSeguido(raw) {
  const id = raw?.id
  if (!idValido(id) || !texto(raw?.nombre) || !texto(raw?.nombreUsuario)) {
    throw new Error('DTO de usuario seguido inválido')
  }
  return { id, nombre: raw.nombre, nombreUsuario: raw.nombreUsuario,
    avatarUrl: texto(raw.avatarUrl), descripcion: texto(raw.descripcion), loSigo: raw.loSigo === true }
}

export function adaptarPagina(raw, adaptar) {
  if (!raw || !Array.isArray(raw.content) || !Number.isInteger(raw.number) || raw.number < 0
      || !Number.isInteger(raw.size) || raw.size <= 0 || !Number.isInteger(raw.totalPages)
      || raw.totalPages < 0 || !Number.isInteger(raw.totalElements) || raw.totalElements < 0
      || typeof raw.last !== 'boolean') throw new Error('Respuesta paginada inválida')
  return { content: raw.content.map(adaptar), number: raw.number, last: raw.last, totalElements: raw.totalElements }
}

export function combinarMensajes(actuales, nuevos) {
  const byId = new Map(actuales.map((mensaje) => [String(mensaje.id), mensaje]))
  for (const mensaje of nuevos) byId.set(String(mensaje.id), mensaje)
  return [...byId.values()].sort((a, b) => Date.parse(a.fechaEnvio) - Date.parse(b.fechaEnvio)
    || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }))
}
