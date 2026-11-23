// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Moderacion from './Moderacion'
import * as moderacion from '../services/moderacionService'
import * as reportesService from '../services/reportesService'
import { notificarReporteCreado } from '../services/reportesEventos'

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ role: 'MODERADOR' }) }))
vi.mock('../services/moderacionService', async (original) => ({
  ...await original(), listarPropuestas: vi.fn(), aprobarPropuesta: vi.fn(), rechazarPropuesta: vi.fn(),
}))
vi.mock('../services/reportesService', async (original) => ({
  ...await original(), listarReportes: vi.fn(), resolverReporte: vi.fn(),
}))

const propuesta = (id, overrides = {}) => ({
  idEvento: id,
  titulo: `Propuesta ${id}`,
  descripcion: `Descripción de la propuesta ${id}`,
  ubicacion: 'Oaxaca',
  imagen: null,
  fechaInicio: '2027-02-01T09:00:00',
  fechaFin: '2027-02-01T18:00:00',
  cupoMaximo: 30,
  fechaCreacion: '2026-11-20T10:00:00',
  estado: 'PENDIENTE',
  proponente: { idUsuario: 7, nombre: 'Ana', nombreUsuario: 'ana' },
  moderadorId: null,
  motivoResolucion: null,
  fechaResolucion: null,
  ...overrides,
})

const appendiceReporte = (id, overrides = {}) => ({
  id,
  publicacionId: 40 + id,
  motivo: 'SPAM',
  descripcion: `Descripción del reporte ${id}`,
  estado: 'PENDIENTE',
  fechaReporte: '2026-11-18T12:30:00',
  reportanteId: 3,
  moderadorId: null,
  resolucion: null,
  fechaResolucion: null,
  ...overrides,
})

const pagina = (content, { number = 0, totalPages = 1, totalElements = content.length } = {}) => ({
  content,
  number,
  size: 10,
  totalElements,
  totalPages,
  first: number === 0,
  last: number >= totalPages - 1,
})

const diferido = () => {
  let resolver
  const promesa = new Promise((resolve) => { resolver = resolve })
  return { promesa, resolver }
}

function configurarListados({ propuestas = [propuesta(12)], reportes = [appendiceReporte(5)], paginasEventos = 1, paginasReportes = 1 } = {}) {
  moderacion.listarPropuestas.mockReset().mockImplementation(({ size = 20, page = 0 } = {}) => Promise.resolve({
    data: size === 1
      ? pagina([], { totalElements: 3, totalPages: 1 })
      : pagina(propuestas, { number: page, totalPages: paginasEventos }),
  }))
  reportesService.listarReportes.mockReset().mockImplementation(({ size = 20, page = 0 } = {}) => Promise.resolve({
    data: size === 1
      ? pagina([], { totalElements: reportes.length + 2, totalPages: 1 })
      : pagina(reportes, { number: page, totalPages: paginasReportes }),
  }))
}

function renderPanel() {
  render(<MemoryRouter><Moderacion /></MemoryRouter>)
}

const llamadasEventos = () => moderacion.listarPropuestas.mock.calls.filter(([args]) => args.size !== 1)
const llamadasReportes = () => reportesService.listarReportes.mock.calls.filter(([args]) => args.size !== 1)

beforeEach(() => {
  vi.clearAllMocks()
  configurarListados()
  moderacion.aprobarPropuesta.mockResolvedValue(propuesta(12, { estado: 'APROBADO' }))
  moderacion.rechazarPropuesta.mockResolvedValue(propuesta(12, { estado: 'RECHAZADO' }))
  reportesService.resolverReporte.mockResolvedValue(appendiceReporte(5, { estado: 'RESUELTO' }))
})
afterEach(cleanup)

describe('Moderación 085: panel funcional', () => {
  it('carga propuestas, reportes y conteos reales del backend', async () => {
    reportesService.listarReportes.mockImplementation(({ size = 20 } = {}) => Promise.resolve({
      data: size === 1
        ? pagina([], { totalElements: 7, totalPages: 1 })
        : pagina([appendiceReporte(5)], { totalElements: 7 }),
    }))
    renderPanel()

    expect(screen.getByRole('heading', { name: 'Moderación · Eventos y reportes' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('3')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('Propuesta 12')).toBeTruthy())
    expect(screen.getByText('Proponente: Ana (@ana)')).toBeTruthy()
    expect(screen.getByText('1 feb 2027 · 09:00 h')).toBeTruthy()
    expect(screen.getAllByText('PENDIENTE').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Revisar' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('tab', { name: 'Reportes' }))
    await waitFor(() => expect(screen.getByText('Reporte #5 · SPAM')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Resolver' })).toBeTruthy()
    expect(llamadasReportes().at(-1)[0]).toMatchObject({ page: 0, size: 10 })
  })

  it('muestra los reportes recientes al crearse uno: limpia filtros y vuelve a la primera página', async () => {
    configurarListados({ reportes: [appendiceReporte(5)], paginasReportes: 3 })
    renderPanel()
    await waitFor(() => expect(llamadasReportes().length).toBeGreaterThan(0))

    fireEvent.click(screen.getByRole('tab', { name: 'Reportes' }))
    await screen.findByText('Reporte #5 · SPAM')

    fireEvent.change(screen.getByLabelText('Estado del reporte'), { target: { value: 'RESUELTO' } })
    await waitFor(() => expect(llamadasReportes().at(-1)[0].estado).toBe('RESUELTO'))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente ›' }))
    await waitFor(() => expect(llamadasReportes().at(-1)[0].page).toBe(1))

    act(() => { notificarReporteCreado() })

    await waitFor(() => expect(llamadasReportes().at(-1)[0]).toMatchObject({ page: 0, size: 10 }))
    expect(llamadasReportes().at(-1)[0].estado).toBe('')
    expect(screen.getByLabelText('Estado del reporte').value).toBe('')
  })

  it('permite recargar manualmente la bandeja desde el backend', async () => {
    renderPanel()
    await waitFor(() => expect(llamadasReportes().length).toBeGreaterThan(0))
    const llamadasAntes = llamadasReportes().length

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar bandeja de revisión' }))

    await waitFor(() => expect(llamadasReportes().length).toBeGreaterThan(llamadasAntes))
  })

  it('navega entre secciones con teclado y expone pestañas accesibles', async () => {
    renderPanel()
    const eventos = screen.getByRole('tab', { name: 'Eventos pendientes' })
    const reportesTab = screen.getByRole('tab', { name: 'Reportes' })
    expect(eventos.getAttribute('aria-selected')).toBe('true')
    expect(eventos.tabIndex).toBe(0)
    expect(reportesTab.tabIndex).toBe(-1)

    fireEvent.keyDown(eventos, { key: 'ArrowRight' })
    expect(reportesTab.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(reportesTab)
    expect(screen.getByRole('tabpanel', { name: 'Reportes' })).toBeTruthy()

    fireEvent.keyDown(reportesTab, { key: 'Home' })
    expect(eventos.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(eventos)
  })

  it('envía filtros y paginación al backend y reinicia la página al filtrar', async () => {
    configurarListados({ propuestas: [propuesta(12)], paginasEventos: 3 })
    renderPanel()
    await waitFor(() => expect(llamadasEventos().length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'APROBADO' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2027-01-01' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2027-01-31' } })
    await waitFor(() => expect(llamadasEventos().at(-1)[0]).toMatchObject({
      page: 0, size: 10, estado: 'APROBADO', fechaDesde: '2027-01-01', fechaHasta: '2027-01-31',
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente ›' }))
    await waitFor(() => expect(llamadasEventos().at(-1)[0].page).toBe(1))

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar propuesta' }), { target: { value: 'oaxaca' } })
    await waitFor(() => expect(llamadasEventos().at(-1)[0]).toMatchObject({ q: 'oaxaca', page: 0 }), { timeout: 1500 })

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(llamadasEventos().at(-1)[0]).toMatchObject({ page: 0, q: '' }))
  })

  it('muestra estados vacío y de error con reintento', async () => {
    configurarListados({ propuestas: [], reportes: [] })
    renderPanel()
    await waitFor(() => expect(screen.getByText('No hay propuestas para revisar')).toBeTruthy())

    cleanup()
    moderacion.listarPropuestas.mockImplementation(({ size = 20 } = {}) => size === 1
      ? Promise.resolve({ data: pagina([], { totalElements: 0 }) })
      : Promise.reject({ response: { status: 500, data: { message: 'Fallo interno' } } }))
    renderPanel()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Fallo interno'))
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(llamadasEventos().length).toBeGreaterThan(1))
  })

  it('aprueba una propuesta sólo después de la respuesta HTTP y refresca las listas', async () => {
    const espera = diferido()
    moderacion.aprobarPropuesta.mockReturnValue(espera.promesa)
    renderPanel()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revisar' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }))
    const revisar = screen.getByRole('dialog', { name: 'Revisar propuesta' })
    fireEvent.click(within(revisar).getByRole('button', { name: 'Aprobar propuesta' }))

    const aprobar = screen.getByRole('dialog', { name: 'Aprobar propuesta' })
    expect(within(aprobar).getByRole('button', { name: 'Confirmar aprobación' }).disabled).toBe(true)
    fireEvent.click(within(aprobar).getByRole('checkbox', { name: /Confirmo que deseo aprobar/ }))
    fireEvent.click(within(aprobar).getByRole('button', { name: 'Confirmar aprobación' }))
    await waitFor(() => expect(moderacion.aprobarPropuesta).toHaveBeenCalledWith(12))
    expect(screen.getByRole('button', { name: 'Aprobando…' }).disabled).toBe(true)
    expect(screen.queryByText('Propuesta aprobada correctamente.')).toBeNull()

    await act(async () => { espera.resolver(propuesta(12, { estado: 'APROBADO' })) })
    await waitFor(() => expect(screen.getByText('Propuesta aprobada correctamente.')).toBeTruthy())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(llamadasEventos().length).toBeGreaterThan(1)
    expect(reportesService.listarReportes).toHaveBeenCalled()
  })

  it('valida el motivo de rechazo y envía únicamente el DTO permitido', async () => {
    renderPanel()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revisar' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rechazar propuesta' }))

    const dialogo = screen.getByRole('dialog', { name: 'Rechazar propuesta' })
    const motivo = within(dialogo).getByRole('textbox', { name: /Motivo del rechazo/ })
    expect(motivo.getAttribute('aria-invalid')).toBe('false')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar rechazo' }))
    expect((await within(dialogo).findByRole('alert')).textContent).toContain('obligatorio')
    expect(moderacion.rechazarPropuesta).not.toHaveBeenCalled()

    fireEvent.change(motivo, { target: { value: '  La fecha de inicio ya pasó  ' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar rechazo' }))
    await waitFor(() => expect(moderacion.rechazarPropuesta).toHaveBeenCalledWith(12, 'La fecha de inicio ya pasó'))
    await waitFor(() => expect(screen.getByText('Propuesta rechazada correctamente.')).toBeTruthy())
  })

  it('resuelve y rechaza reportes con confirmación previa y resolución obligatoria', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: 'Reportes' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Resolver' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))

    const formulario = screen.getByRole('dialog', { name: 'Resolver reporte' })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Continuar' }))
    expect((await within(formulario).findByRole('alert')).textContent).toContain('obligatoria')
    expect(reportesService.resolverReporte).not.toHaveBeenCalled()

    fireEvent.change(within(formulario).getByRole('textbox', { name: /Resolución/ }), { target: { value: 'Contenido retirado' } })
    fireEvent.click(within(formulario).getByRole('radio', { name: 'Resolver reporte' }))
    fireEvent.click(within(formulario).getByRole('button', { name: 'Continuar' }))
    const confirmacion = screen.getByRole('dialog', { name: 'Confirmar resolución' })
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Confirmar resolución' }))
    await waitFor(() => expect(reportesService.resolverReporte).toHaveBeenCalledWith(5, {
      estado: 'RESUELTO', resolucion: 'Contenido retirado',
    }))
    await waitFor(() => expect(screen.getByText('Reporte resuelto correctamente.')).toBeTruthy())

    cleanup()
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: 'Reportes' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Resolver' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    const segundo = screen.getByRole('dialog', { name: 'Resolver reporte' })
    fireEvent.change(within(segundo).getByRole('textbox', { name: /Resolución/ }), { target: { value: 'No procede' } })
    fireEvent.click(within(segundo).getByRole('radio', { name: 'Rechazar reporte' }))
    fireEvent.click(within(segundo).getByRole('button', { name: 'Continuar' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Confirmar resolución' })).getByRole('button', { name: 'Confirmar resolución' }))
    await waitFor(() => expect(reportesService.resolverReporte).toHaveBeenCalledWith(5, {
      estado: 'RECHAZADO', resolucion: 'No procede',
    }))
  })

  it('cancela decisiones sin escribir y restaura el foco del botón', async () => {
    renderPanel()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revisar' })).toBeTruthy())
    const boton = screen.getByRole('button', { name: 'Revisar' })
    boton.focus()
    fireEvent.click(boton)
    expect(screen.getByRole('dialog', { name: 'Revisar propuesta' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(boton)

    fireEvent.click(boton)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rechazar propuesta' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(moderacion.aprobarPropuesta).not.toHaveBeenCalled()
    expect(moderacion.rechazarPropuesta).not.toHaveBeenCalled()
    expect(reportesService.resolverReporte).not.toHaveBeenCalled()
  })

  it('bloquea el doble envío mientras la petición está en curso', async () => {
    const espera = diferido()
    moderacion.rechazarPropuesta.mockReturnValue(espera.promesa)
    renderPanel()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revisar' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rechazar propuesta' }))
    const dialogo = screen.getByRole('dialog', { name: 'Rechazar propuesta' })
    fireEvent.change(within(dialogo).getByRole('textbox', { name: /Motivo del rechazo/ }), { target: { value: 'Motivo válido' } })
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar rechazo' })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)
    expect(moderacion.rechazarPropuesta).toHaveBeenCalledTimes(1)
    await act(async () => { espera.resolver(propuesta(12, { estado: 'RECHAZADO' })) })
  })

  it('no ofrece acciones para propuestas y reportes con resolución definitiva', async () => {
    configurarListados({
      propuestas: [propuesta(12, { estado: 'APROBADO' })],
      reportes: [appendiceReporte(5, { estado: 'RESUELTO', resolucion: 'Cerrado' })],
    })
    renderPanel()
    await waitFor(() => expect(screen.getByText('Propuesta 12')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Revisar' }).disabled).toBe(true)

    fireEvent.click(screen.getByRole('tab', { name: 'Reportes' }))
    await waitFor(() => expect(screen.getByText('Reporte #5 · SPAM')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Resolver' }).disabled).toBe(true)
  })

  it('mantiene etiquetas visibles, scroll controlado y layout de bandeja', async () => {
    renderPanel()
    await waitFor(() => expect(screen.getByText('Propuesta 12')).toBeTruthy())
    expect(screen.getByRole('region', { name: 'Resumen de moderación' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Bandeja de revisión' })).toBeTruthy()
    expect(document.querySelector('.mod-tabla-contenedor')).toBeTruthy()
    expect(screen.getByRole('search', { name: 'Búsqueda y filtros de propuestas' })).toBeTruthy()
    expect(screen.queryByText('NAVEGACIÓN Y PRIVACIDAD')).toBeNull()
    expect(screen.queryByText('Filtro y paginación en el backend · datos reales de la API')).toBeNull()
  })
})
