import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  RUTA_REPORTES,
  crearReporte,
  listarReportes,
  resolverReporte,
} from './reportesService'

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())

describe('reportesService (rutas conservadas)', () => {
  it('mantiene la creación de reportes sin cambios', async () => {
    api.post.mockResolvedValue({ data: {} })
    await crearReporte({ publicacionId: 5, motivo: 'SPAM', descripcion: '  texto  ' })
    expect(api.post).toHaveBeenCalledWith(RUTA_REPORTES, {
      publicacionId: 5,
      motivo: 'SPAM',
      descripcion: 'texto',
    }, { signal: undefined })
  })

  it('lista reportes usando page, size y estado', async () => {
    const signal = new AbortController().signal
    api.get.mockResolvedValue({ data: { content: [] } })
    await listarReportes({ page: 1, size: 10, estado: 'en_revision', signal })
    expect(api.get).toHaveBeenCalledWith(RUTA_REPORTES, {
      params: { page: 1, size: 10, estado: 'EN_REVISION' },
      signal,
    })
  })

  it('resuelve enviando estado y resolución, sin campos extra', async () => {
    api.patch.mockResolvedValue({ data: {} })
    await resolverReporte(8, { estado: 'rechazado', resolucion: '  No corresponde  ' })
    expect(api.patch).toHaveBeenCalledWith('/api/reportes/8/resolver', {
      estado: 'RECHAZADO',
      resolucion: 'No corresponde',
    })
  })

  it('rechaza estados y resoluciones inválidos localmente', async () => {
    await expect(resolverReporte(8, { estado: 'PENDIENTE', resolucion: 'x' })).rejects.toThrow(/RESUELTO o RECHAZADO/)
    await expect(resolverReporte(8, { estado: 'RESUELTO', resolucion: '  ' })).rejects.toThrow(/obligatoria/)
    await expect(resolverReporte(0, { estado: 'RESUELTO', resolucion: 'x' })).rejects.toThrow(/identificador/)
    expect(api.patch).not.toHaveBeenCalled()
  })
})
