import { afterEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  CONTRATO_FILTROS_CONFIRMADO,
  FILTROS_PROPUESTOS,
  construirParametrosEventos,
  consultarEvento,
  consultarEventos,
  consultarMisPropuestas,
} from './eventosService'

const originalAdapter = api.defaults.adapter
afterEach(() => { api.defaults.adapter = originalAdapter })

const responder = (config) => Promise.resolve({ status: 200, data: {}, config, headers: {} })

describe('servicio de eventos (contrato propuesto 070)', () => {
  it('el contrato de filtros sigue sin confirmarse y sólo se envían page y size', () => {
    expect(CONTRATO_FILTROS_CONFIRMADO).toBe(false)
    expect(FILTROS_PROPUESTOS).toEqual(['q', 'estado', 'fechaDesde', 'fechaHasta', 'tipo', 'modalidad'])
    expect(construirParametrosEventos({ page: 2, size: 5, filtros: { q: 'polillas', tipo: 'BIOBLITZ' } }))
      .toEqual({ page: 2, size: 5 })
  })

  it('prepara los filtros propuestos sin inventar parámetros', () => {
    const params = construirParametrosEventos({
      filtros: {
        q: '  apis ', estado: 'aprobado', fechaDesde: '2026-01-01',
        tipo: 'bioblitz', modalidad: 'presencial',
        orderBy: 'titulo',
      },
      incluirFiltrosPropuestos: true,
    })
    expect(params).toEqual({
      page: 0, size: 10, q: 'apis', estado: 'APROBADO', fechaDesde: '2026-01-01',
      tipo: 'bioblitz', modalidad: 'presencial',
    })
    expect(params.orderBy).toBeUndefined()
  })

  it('traduce próximos y pasados a fechas del contrato propuesto', () => {
    const futuros = construirParametrosEventos({ filtros: { periodo: 'futuros' }, incluirFiltrosPropuestos: true })
    expect(futuros.fechaDesde).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(futuros.periodo).toBeUndefined()
    const pasados = construirParametrosEventos({ filtros: { periodo: 'pasados' }, incluirFiltrosPropuestos: true })
    expect(pasados.fechaHasta).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('usa la instancia Axios existente y reenvía AbortSignal', async () => {
    const adapter = vi.fn(responder)
    api.defaults.adapter = adapter
    const controller = new AbortController()
    await consultarEventos({ page: 1, size: 10, filtros: { q: 'x' }, signal: controller.signal })
    expect(adapter.mock.calls[0][0].url).toBe('/api/eventos')
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 1, size: 10 })
    expect(adapter.mock.calls[0][0].signal).toBe(controller.signal)

    await consultarMisPropuestas({ signal: controller.signal })
    expect(adapter.mock.calls[1][0].url).toBe('/api/eventos/mis-propuestas')

    await consultarEvento(15, { signal: controller.signal })
    expect(adapter.mock.calls[2][0].url).toBe('/api/eventos/15')
    await expect(consultarEvento(null)).rejects.toThrow(TypeError)
  })
})
