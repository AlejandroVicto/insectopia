// Solo fixtures editoriales. La demo nunca persiste mensajes ni sustituye errores HTTP.
const persona = (id, nombre, nombreUsuario, loSigo) => ({ id, nombre, nombreUsuario, avatarUrl: null, loSigo })
export const conversacionesDemo = [
  { id: 'demo-tw', interlocutor: persona('demo-t', 'TinkyW', 'TinkyW', true), ultimoMensaje: { id: 'tw-4', contenido: 'Cerca de San José del Pacífico. Luego te comparto más datos.', fechaEnvio: '2026-11-20T08:47:00' }, noLeidos: 2, oculta: false },
  { id: 'demo-ad', interlocutor: persona('demo-a', 'Adelina', 'AdNieto', true), ultimoMensaje: { id: 'ad-2', contenido: 'Gracias por compartir la foto', fechaEnvio: '2026-11-19T12:03:00' }, noLeidos: 0, oculta: false },
  { id: 'demo-nr', interlocutor: persona('demo-n', 'Nora', 'nora.insectos', false), ultimoMensaje: { id: 'nr-1', contenido: 'Nos vemos en el monitoreo', fechaEnvio: '2026-11-18T16:30:00' }, noLeidos: 1, oculta: false },
  { id: 'demo-mg', interlocutor: persona('demo-m', 'Magali', 'Magali', null), ultimoMensaje: null, noLeidos: 0, oculta: false },
]

export const seguidosDemo = [
  { ...persona('demo-t', 'TinkyW', 'TinkyW', true), descripcion: 'Observación de escarabajos' },
  { ...persona('demo-a', 'Adelina', 'AdNieto', true), descripcion: 'Arácnidos' },
  { ...persona('demo-m', 'Magali', 'TinkyWbio', true), descripcion: 'Biodiversidad' },
  { ...persona('demo-l', 'Lucía', 'lucia.bosques', true), descripcion: 'Bosques nubosos' },
]

export function consultarSeguidosDemo({ page = 0, size = 20, q = '', userId, users = seguidosDemo } = {}) {
  const term = q.trim().toLocaleLowerCase('es')
  const matched = users.filter((person) => person.loSigo === true && String(person.id) !== String(userId)
    && `${person.nombre} ${person.nombreUsuario}`.toLocaleLowerCase('es').includes(term))
  return { content: matched.slice(page * size, (page + 1) * size), number: page, size,
    totalPages: Math.ceil(matched.length / size), totalElements: matched.length, last: (page + 1) * size >= matched.length }
}

export function consultarConversacionesDemo({ page = 0, size = 20, q = '', noLeidos = false, chats = conversacionesDemo } = {}) {
  const term = q.trim().toLocaleLowerCase('es')
  const filtered = chats.filter((chat) => !chat.oculta && (!noLeidos || chat.noLeidos > 0)
    && `${chat.interlocutor.nombre} ${chat.interlocutor.nombreUsuario}`.toLocaleLowerCase('es').includes(term))
  return { content: filtered.slice(page * size, (page + 1) * size), number: page, size,
    totalPages: Math.ceil(filtered.length / size), totalElements: filtered.length, last: (page + 1) * size >= filtered.length }
}

export function consultarMensajesDemo(id, userId, { page = 0, size = 30 } = {}) {
  const make = (key, remitenteId, contenido, fechaEnvio) => ({ id: key, conversacionId: id, remitenteId, contenido, fechaEnvio })
  const items = {
    'demo-tw': [make('tw-1', 'demo-t', '¡Hola! Encontré un escarabajo brillante en el bosque.', '2026-11-20T08:40:00'),
      make('tw-2', 'demo-t', '¿Sabes si podría ser Chrysina limbata?', '2026-11-20T08:41:00'),
      make('tw-3', userId, '¡Qué buen hallazgo! Parece de esa especie. ¿Dónde fue?', '2026-11-20T08:43:00'),
      make('tw-4', 'demo-t', 'Cerca de San José del Pacífico.\nLuego te comparto más datos.', '2026-11-20T08:47:00')],
    'demo-ad': [make('ad-1', userId, 'Te comparto la fotografía del sendero.', '2026-11-18T09:30:00'),
      make('ad-2', 'demo-a', 'Gracias por compartir la foto', '2026-11-19T12:03:00')],
    'demo-nr': [make('nr-1', 'demo-n', 'Nos vemos en el monitoreo', '2026-11-18T16:30:00')],
    'demo-mg': [],
  }[id] ?? []
  const desc = [...items].reverse()
  return { content: desc.slice(page * size, (page + 1) * size), number: page, size,
    totalPages: Math.ceil(desc.length / size), totalElements: desc.length, last: (page + 1) * size >= desc.length }
}
