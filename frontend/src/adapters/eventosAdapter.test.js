import { describe, expect, it } from 'vitest'
import { adaptarEvento, adaptarPaginaEventos } from './eventosAdapter'

const basico = {
  idEvento: 12,
  titulo: 'Bioblitz de polillas',
  descripcion: 'Muestreo nocturno',
  ubicacion: 'Oaxaca',
  imagen: null,
  fechaInicio: '2026-12-05T19:30:00',
  fechaFin: '2026-12-07T03:00:00',
  cupoMaximo: 30,
  participantesConfirmados: 24,
  estado: 'APROBADO',
}

describe('adaptador de eventos', () => {
  it('separa estado del servidor y etiqueta visual y respeta la zona horaria', () => {
    const evento = adaptarEvento(basico)
    expect(evento.estado).toBe('APROBADO')
    expect(evento.estadoEtiqueta).toBe('Aprobado')
    expect(evento.estadoTono).toBe('aprobado')
    expect(evento.horaInicio).toBe('19:30')
    expect(evento.horaFin).toBe('03:00')
    expect(evento.rangoFechas).toMatch(/2026/)
    expect(evento.imagenUrl).toBeNull()
    expect(evento.cupoDisponible).toBe(true)
  })

  it('tolera nulos, desconoce estados nuevos y no asume inscripción', () => {
    const evento = adaptarEvento({
      ...basico,
      descripcion: null, ubicacion: undefined, imagen: 'javascript:alert(1)',
      fechaFin: null, cupoMaximo: null, participantesConfirmados: undefined,
      estado: 'BORRADOR',
    })
    expect(evento.descripcion).toBeNull()
    expect(evento.ubicacion).toBeNull()
    expect(evento.imagenUrl).toBeNull()
    expect(evento.fechaFinTexto).toBeNull()
    expect(evento.cupoDisponible).toBeNull()
    expect(evento.estado).toBeNull()
    expect(evento.estadoEtiqueta).toBe('Sin estado confirmado')
    expect(evento.inscripcionEstado).toBeNull()
    expect(evento.inscripcionEtiqueta).toBeNull()
  })

  it('acepta imágenes http y rutas relativas, pero no esquemas ejecutables', () => {
    expect(adaptarEvento({ ...basico, imagen: '/uploads/evento.jpg' }).imagenUrl).toBe('/uploads/evento.jpg')
    expect(adaptarEvento({ ...basico, imagen: 'https://ejemplo.test/e.png' }).imagenUrl).toBe('https://ejemplo.test/e.png')
    expect(adaptarEvento({ ...basico, imagen: 'data:text/html,<script>' }).imagenUrl).toBeNull()
  })

  it('sólo publica datos del proponente que el backend expone como públicos', () => {
    const evento = adaptarEvento({
      ...basico,
      proponente: { id: 3, nombre: 'Claudia', nombreUsuario: 'montes', email: 'claudia@ejemplo.test' },
    })
    expect(evento.proponente).toEqual({ nombre: 'Claudia', usuario: 'montes' })
    expect(JSON.stringify(evento)).not.toContain('claudia@ejemplo.test')
  })

  it('rechaza DTO incompletos y paginaciones inválidas', () => {
    expect(() => adaptarEvento({ titulo: 'Sin id', fechaInicio: basico.fechaInicio })).toThrow()
    expect(() => adaptarEvento({ ...basico, fechaInicio: 'no-fecha' })).toThrow()
    expect(() => adaptarPaginaEventos({ content: [] })).toThrow()
  })

  it('adapta una página completa con los campos de paginación del backend', () => {
    const pagina = adaptarPaginaEventos({
      content: [basico], number: 0, size: 10, totalPages: 1, totalElements: 1, first: true, last: true,
    })
    expect(pagina.content).toHaveLength(1)
    expect(pagina.totalElements).toBe(1)
    expect(pagina.last).toBe(true)
  })

  it('conserva el cupo y expone motivoResolucion y propiedad sólo con datos reales', () => {
    const propio = adaptarEvento({ ...basico, esPropio: true, motivoResolucion: '  Falta el permiso  ' })
    expect(propio.cupoMaximo).toBe(30)
    expect(propio.cupoDisponible).toBe(true)
    expect(propio.esPropio).toBe(true)
    expect(propio.motivoResolucion).toBe('Falta el permiso')

    const ajeno = adaptarEvento({ ...basico, idProponente: 99, motivoResolucion: 'Motivo ajeno' }, { idUsuario: 7 })
    expect(ajeno.esPropio).toBe(false)
    expect(ajeno.motivoResolucion).toBe('Motivo ajeno')

    const sinMotivo = adaptarEvento({ ...basico, motivoResolucion: '   ' })
    expect(sinMotivo.motivoResolucion).toBeNull()
  })

  it('propaga las opciones de propiedad a todos los eventos de la página', () => {
    const pagina = adaptarPaginaEventos({
      content: [basico], number: 0, size: 10, totalPages: 1, totalElements: 1, first: true, last: true,
    }, { idUsuario: 12, propia: true })
    expect(pagina.content[0].esPropio).toBe(true)
  })
})
