// Reglas de presentación derivadas del esquema real. La autorización definitiva
// debe repetirse en Spring Security cuando existan los endpoints 070/072.

export function puedeEditarEvento(evento) {
  return Boolean(evento?.esPropio && evento.estado === 'PENDIENTE')
}

export function motivoNoEditable(evento) {
  if (!evento) return 'No hay información de la propuesta.'
  if (!evento.esPropio) return 'Sólo puedes editar tus propias propuestas.'
  if (evento.estado !== 'PENDIENTE') return 'Sólo se pueden editar propuestas pendientes de revisión.'
  return ''
}

export function cupoConfirmado(evento) {
  return evento?.cupoDisponible === true
}

export function inscripcionActiva(evento) {
  return evento?.inscripcionEstado === 'INSCRITO'
}

export function puedeInscribirseEvento(evento) {
  if (!evento) return false
  if (evento.estado !== 'APROBADO') return false
  if (evento.esPasado) return false
  if (inscripcionActiva(evento)) return false
  return cupoConfirmado(evento)
}

export function motivoNoInscribible(evento) {
  if (!evento) return 'No hay información del evento.'
  if (evento.estado !== 'APROBADO') return 'Este evento todavía no está aprobado.'
  if (evento.esPasado) return 'El evento ya finalizó.'
  if (inscripcionActiva(evento)) return 'Ya tienes una inscripción activa en este evento.'
  if (evento.cupoDisponible === false) return 'El cupo está completo.'
  return ''
}

export function puedeCancelarInscripcion(evento) {
  return Boolean(inscripcionActiva(evento) && !evento?.esPasado)
}

export function motivoNoCancelable(evento) {
  if (!evento) return 'No hay información del evento.'
  if (!inscripcionActiva(evento)) return 'No tienes una inscripción activa que cancelar.'
  if (evento.esPasado) return 'El evento ya finalizó; la cancelación ya no está disponible.'
  return ''
}
