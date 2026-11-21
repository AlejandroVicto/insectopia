export function fechaNotificacion(value, now = Date.now()) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Fecha no disponible'
  const minutes = Math.floor((now - date.getTime()) / 60000)
  if (minutes >= 0 && minutes < 1) return 'Hace unos segundos'
  if (minutes >= 1 && minutes < 60) return `Hace ${minutes} min`
  if (minutes >= 60 && minutes < 1440) return `Hace ${Math.floor(minutes / 60)} h`
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
