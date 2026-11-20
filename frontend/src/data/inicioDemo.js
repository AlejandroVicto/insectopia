import escarabajo from '../assets/escarabajo-demo.svg'

// Editorial fixtures only. They are never sent to the backend or presented as real MySQL records.
export const publicacionesDemo = [
  {
    id: 'demo-1', autor: { id: 'demo-ale', nombre: 'Ale', nombreUsuario: 'Alezzz', avatarUrl: null },
    titulo: 'Hallazgo excepcional de Chrysina limbata en el bosque nuboso',
    contenido: 'Ejemplar con cutícula reflectante, observado a 1,450 msnm en un hábitat boscoso.\nRegistro ilustrado para la comunidad de Insectopia.',
    imagenUrl: escarabajo, imagenAlt: 'Ilustración de demostración de un escarabajo sobre una rama',
    fechaPublicacion: '2026-11-20T08:00:00', totalReacciones: 3500, totalComentarios: 1100,
    reaccionUsuario: null, estado: 'VISIBLE',
  },
  {
    id: 'demo-2', autor: { id: 'demo-adelina', nombre: 'Adelina', nombreUsuario: 'AdNieto', avatarUrl: null },
    titulo: null, contenido: 'Hoy observé un nido de hormigas cortadoras cerca del sendero. ¿Alguien conoce esta especie?',
    imagenUrl: null, fechaPublicacion: '2026-11-19T13:30:00', totalReacciones: 28, totalComentarios: 7,
    reaccionUsuario: null, estado: 'VISIBLE',
  },
  {
    id: 'demo-3', autor: { id: 'demo-magali', nombre: 'Magali', nombreUsuario: 'TinkyW', avatarUrl: null },
    titulo: null, contenido: 'Una libélula descansando junto a las plantas del jardín comunitario.',
    imagenUrl: escarabajo, imagenAlt: 'Ilustración de demostración; pendiente fotografía original del avistamiento',
    fechaPublicacion: '2026-11-18T10:00:00', totalReacciones: 92, totalComentarios: 14,
    reaccionUsuario: null, estado: 'VISIBLE',
  },
  {
    id: 'demo-4', autor: { id: 'demo-nora', nombre: 'Nora', nombreUsuario: 'nora.insectos', avatarUrl: null },
    titulo: 'Notas del bosque', contenido: 'En la visita de esta semana registramos escarabajos y polillas sin alterar su hábitat.',
    imagenUrl: null, fechaPublicacion: '2026-11-17T17:15:00', totalReacciones: 6, totalComentarios: 0,
    reaccionUsuario: null, estado: 'VISIBLE',
  },
]

export const sugerenciasDemo = [
  { id: 's1', nombre: 'Adelina', nombreUsuario: 'AdNieto', interes: 'Arácnidos', avatarUrl: null },
  { id: 's2', nombre: 'Magali', nombreUsuario: 'TinkyW', interes: 'Escarabajos', avatarUrl: null },
  { id: 's3', nombre: 'Ale', nombreUsuario: 'Alezz', interes: 'Hormigas', avatarUrl: null },
]
export const tendenciasDemo = [
  { id: 't1', nombre: 'Chrysina limbata', registros: 1200 },
  { id: 't2', nombre: 'Lucanus cervus', registros: 890 },
  { id: 't3', nombre: 'Atta mexicana', registros: 640 },
]
export const eventosDemo = [
  { id: 'e1', tipo: 'BIOBLITZ / OBSERVACIÓN', nombre: 'Monitoreo de polillas', ubicacion: 'San José del Pacífico, Oaxaca' },
]

export function consultarDemo({ page, size, feed, q }) {
  const base = feed === 'global' ? publicacionesDemo : publicacionesDemo.filter((post) => post.id !== 'demo-3')
  const text = q.trim().toLocaleLowerCase('es')
  const matches = text ? base.filter((post) => `${post.contenido} ${post.titulo ?? ''} ${post.autor.nombre} ${post.autor.nombreUsuario}`.toLocaleLowerCase('es').includes(text)) : base
  const totalPages = Math.ceil(matches.length / size)
  return {
    content: matches.slice(page * size, (page + 1) * size), number: page, size,
    totalElements: matches.length, totalPages, first: page === 0, last: page >= totalPages - 1,
  }
}
