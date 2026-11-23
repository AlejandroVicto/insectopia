import { afterEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  CONTRATO_FILTROS_CONFIRMADO,
  ENDPOINTS_ESCRITURA_PROPUESTOS,
  FILTROS_PROPUESTOS,
  OPERACIONES_EVENTOS_DISPONIBLES,
  actualizarEvento,
  cancelarMiInscripcion,
  construirParametrosEventos,
  consultarEvento,
  consultarEventos,
  consultarMisPropuestas,
  consultarMisParticipaciones,
  crearEvento,
  inscribirmeEnEvento,
  subirImagenEvento,
  quitarImagenEvento,
} from './eventosService'

const originalAdapter = api.defaults.adapter
afterEach(() => { api.defaults.adapter = originalAdapter })

const responder = (config) => Promise.resolve({ status: 200, data: {}, config, headers: {} })

describe('servicio de eventos (contrato 070/072)', () => {
  it('el contrato de filtros está confirmado y no admite campos inexistentes', () => {
    expect(CONTRATO_FILTROS_CONFIRMADO).toBe(true)
    expect(FILTROS_PROPUESTOS).toEqual(['q', 'estado', 'periodo', 'fechaDesde', 'fechaHasta'])
    expect(construirParametrosEventos({ page: 2, size: 5, filtros: { q: 'polillas', tipo: 'BIOBLITZ' } }))
      .toEqual({ page: 2, size: 5, q: 'polillas' })
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
    })
    expect(params.orderBy).toBeUndefined()
    expect(params.tipo).toBeUndefined()
    expect(params.modalidad).toBeUndefined()
  })

  it('envía el periodo al backend para aplicar fechas según la zona del servidor', () => {
    const futuros = construirParametrosEventos({ filtros: { periodo: 'futuros' } })
    expect(futuros.periodo).toBe('futuros')
    expect(futuros.fechaDesde).toBeUndefined()
    const pasados = construirParametrosEventos({ filtros: { periodo: 'pasados' } })
    expect(pasados.periodo).toBe('pasados')
  })

  it('usa la instancia Axios existente y reenvía AbortSignal', async () => {
    const adapter = vi.fn(responder)
    api.defaults.adapter = adapter
    const controller = new AbortController()
    await consultarEventos({ page: 1, size: 10, filtros: { q: 'x' }, signal: controller.signal })
    expect(adapter.mock.calls[0][0].url).toBe('/api/eventos')
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 1, size: 10, q: 'x' })
    expect(adapter.mock.calls[0][0].signal).toBe(controller.signal)

    await consultarMisPropuestas({ signal: controller.signal })
    expect(adapter.mock.calls[1][0].url).toBe('/api/eventos/mis-propuestas')

    await consultarMisParticipaciones({ signal: controller.signal })
    expect(adapter.mock.calls[2][0].url).toBe('/api/eventos/mis-participaciones')

    await consultarEventos({ proximos: true, signal: controller.signal })
    expect(adapter.mock.calls[3][0].params).toEqual({ page: 0, size: 10, proximos: true })

    await consultarEvento(15, { signal: controller.signal })
    expect(adapter.mock.calls[4][0].url).toBe('/api/eventos/15')
    await expect(consultarEvento(null)).rejects.toThrow(TypeError)
  })

  it('conecta escrituras reales sin aceptar IDs de usuario en las rutas', async () => {
    expect(OPERACIONES_EVENTOS_DISPONIBLES).toBe(true)
    expect(ENDPOINTS_ESCRITURA_PROPUESTOS).toEqual({
      crear: '/api/eventos', editar: '/api/eventos/{id}',
      inscribir: '/api/eventos/{id}/participantes/me',
      cancelarInscripcion: '/api/eventos/{id}/participantes/me',
    })

    const adapter = vi.fn(responder)
    api.defaults.adapter = adapter
    await crearEvento({ titulo: 'Evento' })
    await actualizarEvento(1, { titulo: 'Editado' })
    await inscribirmeEnEvento(1)
    await cancelarMiInscripcion(1)
    expect(adapter.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['post', '/api/eventos'], ['patch', '/api/eventos/1'],
      ['post', '/api/eventos/1/participantes/me'], ['delete', '/api/eventos/1/participantes/me'],
    ])
    await expect(actualizarEvento(null, {})).rejects.toThrow(TypeError)
    expect(adapter).toHaveBeenCalledTimes(4)
  })

  it('sube archivos multipart y quita imágenes sin mandar el archivo en JSON', async () => {
    const adapter = vi.fn(responder)
    api.defaults.adapter = adapter
    const archivo = new File(['foto'], 'campo.jpg', { type: 'image/jpeg' })
    await subirImagenEvento(21, archivo)
    const solicitud = adapter.mock.calls[0][0]
    expect(solicitud.url).toBe('/api/eventos/21/imagen')
    expect(solicitud.data).toBeInstanceOf(FormData)
    expect(solicitud.data.get('imagen').name).toBe('campo.jpg')
    expect(solicitud.headers.get('Content-Type')).not.toBe('application/json')
    await quitarImagenEvento(21)
    expect(adapter.mock.calls[1][0].method).toBe('delete')
    await expect(subirImagenEvento(null, archivo)).rejects.toThrow(TypeError)
    await expect(subirImagenEvento(21, null)).rejects.toThrow(TypeError)
    expect(adapter).toHaveBeenCalledTimes(2)
  })
})
