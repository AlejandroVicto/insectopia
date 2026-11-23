const MESES = Object.freeze([
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
])

export function formatearFecha(valor, { incluirHora = false } = {}) {
  if (typeof valor !== 'string' || !valor.trim()) return 'No disponible'
  const [fecha, tiempo = ''] = valor.trim().split('T')
  const [anio, mes, dia] = fecha.split('-')
  if (!anio || !mes || !dia) return valor
  const indiceMes = Number(mes) - 1
  const nombreMes = MESES[indiceMes]
  const base = `${Number(dia)} ${nombreMes ?? mes} ${anio}`
  if (!incluirHora) return base
  const horas = tiempo ? tiempo.split(':').slice(0, 2).join(':') : ''
  return horas ? `${base} · ${horas} h` : base
}

export function nombreProponente(propuesta) {
  const proponente = propuesta?.proponente
  if (!proponente) return 'Cuenta eliminada'
  if (proponente.nombre && proponente.nombreUsuario) {
    return `${proponente.nombre} (@${proponente.nombreUsuario})`
  }
  return proponente.nombre || proponente.nombreUsuario || 'Proponente sin nombre'
}

export function esEstadoFinal(tipo, estado) {
  if (tipo === 'eventos') return estado !== 'PENDIENTE'
  return !['PENDIENTE', 'EN_REVISION'].includes(estado)
}

export function claseEstado(estado) {
  const normalizado = String(estado ?? '').toLowerCase()
  if (normalizado.includes('pendiente')) return 'mod-chip--pendiente'
  if (normalizado.includes('revision')) return 'mod-chip--revision'
  if (normalizado.includes('aprobado') || normalizado.includes('resuelto')) return 'mod-chip--aprobado'
  if (normalizado.includes('rechazado')) return 'mod-chip--rechazado'
  return 'mod-chip--neutro'
}
