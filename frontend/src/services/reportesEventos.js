// Señal global para que la bandeja de moderación se entere de los reportes
// creados desde el feed o desde el detalle de una publicación.
export const EVENTO_REPORTE_CREADO = 'insectopia:reporte-creado'
export const CLAVE_REPORTES_ACTUALIZADOS = 'insectopia:reportes-actualizados'

export function notificarReporteCreado() {
  const sello = String(Date.now())
  try {
    window.localStorage.setItem(CLAVE_REPORTES_ACTUALIZADOS, sello)
  } catch {
    // El almacenamiento puede estar deshabilitado; el evento local sigue funcionando.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_REPORTE_CREADO, { detail: { sello } }))
}

export function suscribirseAReportesCreados(callback) {
  const alCrear = () => callback()
  const alAlmacenar = (evento) => {
    if (evento.key === CLAVE_REPORTES_ACTUALIZADOS) callback()
  }

  window.addEventListener(EVENTO_REPORTE_CREADO, alCrear)
  window.addEventListener('storage', alAlmacenar)

  return () => {
    window.removeEventListener(EVENTO_REPORTE_CREADO, alCrear)
    window.removeEventListener('storage', alAlmacenar)
  }
}
