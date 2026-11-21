import api from './api'

// Ruta y nombres JSON propuestos: Reporte y la migración V7 ya existen, pero todavía no hay
// ReportesController ni DTO confirmado. Si el contrato cambia, ajustar solo este módulo.
export function crearReporte({ publicacionId, motivo, descripcion, signal } = {}) {
  if (publicacionId === null || publicacionId === undefined || publicacionId === '') {
    return Promise.reject(new TypeError('Se requiere la publicación a reportar'))
  }
  if (typeof motivo !== 'string' || !motivo.trim()) {
    return Promise.reject(new TypeError('El motivo del reporte es obligatorio'))
  }
  return api.post('/api/reportes', {
    publicacionId,
    motivo: motivo.trim(),
    descripcion: typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null,
  }, { signal })
}
