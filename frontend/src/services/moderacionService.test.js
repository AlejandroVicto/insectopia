import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  RUTA_PROPUESTAS_MODERACION,
  aprobarPropuesta,
  listarPropuestas,
  rechazarPropuesta,
} from './moderacionService'

vi.mock('./api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())

describe('moderacionService 086', () => {
  it('lista propuestas con page, size y filtros del contrato', async () => {
    const signal = new AbortController().signal
    api.get.mockResolvedValue({ data: { content: [] } })
    await listarPropuestas({ page: 2, size: 15, q: '  oaxaca  ', estado: 'aprobado', fechaDesde: '2027-01-01', fechaHasta: '2027-01-31', signal })
    expect(api.get).toHaveBeenCalledWith(RUTA_PROPUESTAS_MODERACION, {
      params: {
        page: 2,
        size: 15,
        q: 'oaxaca',
        estado: 'APROBADO',
        fechaDesde: '2027-01-01',
        fechaHasta: '2027-01-31',
      },
      signal,
    })
  })

  it('omite filtros vacíos y estados no moderables', async () => {
    api.get.mockResolvedValue({ data: { content: [] } })
    await listarPropuestas({ estado: 'CANCELADO', q: '   ' })
    expect(api.get.mock.calls[0][1].params).toEqual({ page: 0, size: 20 })
  })

  it('aprueba sin cuerpo y rechaza enviando únicamente el motivo', async () => {
    api.patch.mockResolvedValue({ data: {} })
    await aprobarPropuesta(12)
    expect(api.patch).toHaveBeenNthCalledWith(1, '/api/moderacion/eventos/12/aprobar')

    await rechazarPropuesta(' 12 ', '  La fecha ya pasó  ')
    expect(api.patch).toHaveBeenNthCalledWith(2, '/api/moderacion/eventos/12/rechazar', {
      motivo: 'La fecha ya pasó',
    })
  })

  it('valida identificador y motivo antes de llamar al backend', async () => {
    await expect(aprobarPropuesta(0)).rejects.toThrow(/identificador/)
    await expect(rechazarPropuesta(12, '   ')).rejects.toThrow(/obligatorio/)
    await expect(rechazarPropuesta(12, 'x'.repeat(501))).rejects.toThrow(/500 caracteres/)
    expect(api.patch).not.toHaveBeenCalled()
  })
})
