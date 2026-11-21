// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  CAMPO_IMAGEN_FORMDATA,
  actualizarPublicacion,
  crearPublicacion,
  eliminarPublicacion,
  prepararFormDataPublicacion,
} from './publicacionesService'
import { crearReporte } from './reportesService'

const originalAdapter = api.defaults.adapter
afterEach(() => { api.defaults.adapter = originalAdapter })

function adapterQueResponde(data) {
  return vi.fn((config) => Promise.resolve({ status: 200, data, config, headers: {} }))
}

describe('servicios de modales de publicaciones', () => {
  it('crea publicaciones con los únicos campos admitidos por la entidad', async () => {
    const adapter = adapterQueResponde({ id: 1 })
    api.defaults.adapter = adapter
    await crearPublicacion({ contenido: '  Observación de campo  ', imagen: '  https://img.test/a.jpg  ', titulo: 'no admitido' })
    const config = adapter.mock.calls[0][0]
    expect(config.url).toBe('/api/publicaciones')
    expect(config.method).toBe('post')
    expect(JSON.parse(config.data)).toEqual({ contenido: 'Observación de campo', imagen: 'https://img.test/a.jpg' })
  })

  it('rechaza crear contenido vacío sin llamar a la API', async () => {
    const adapter = adapterQueResponde({})
    api.defaults.adapter = adapter
    await expect(crearPublicacion({ contenido: '   ' })).rejects.toBeInstanceOf(TypeError)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('prepara FormData con contenido y archivo sin contactar al backend', () => {
    const adapter = adapterQueResponde({})
    api.defaults.adapter = adapter
    const archivo = new File([new Uint8Array([1, 2, 3])], 'macro.jpg', { type: 'image/jpeg' })
    const datos = prepararFormDataPublicacion({ contenido: '  Observación de campo  ', imagen: archivo })

    expect(CAMPO_IMAGEN_FORMDATA).toBe('imagen')
    expect(datos.get('contenido')).toBe('Observación de campo')
    const adjunto = datos.get('imagen')
    expect(adjunto).toBeInstanceOf(File)
    expect(adjunto.name).toBe('macro.jpg')
    expect(adjunto.type).toBe('image/jpeg')
    expect(adjunto.size).toBe(3)
    expect(() => prepararFormDataPublicacion({ contenido: 'texto' })).toThrow(TypeError)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('actualiza por identificador codificado y no reenvía imagen desconocida', async () => {
    const adapter = adapterQueResponde({ id: 'a/b' })
    api.defaults.adapter = adapter
    await actualizarPublicacion('a/b', { contenido: 'Texto actualizado' })
    const config = adapter.mock.calls[0][0]
    expect(config.url).toBe('/api/publicaciones/a%2Fb')
    expect(config.method).toBe('put')
    expect(JSON.parse(config.data)).toEqual({ contenido: 'Texto actualizado' })
    await expect(actualizarPublicacion(null, { contenido: 'texto' })).rejects.toBeInstanceOf(TypeError)
  })

  it('elimina con DELETE y exige identificador', async () => {
    const adapter = adapterQueResponde('')
    api.defaults.adapter = adapter
    await eliminarPublicacion(15)
    expect(adapter.mock.calls[0][0].url).toBe('/api/publicaciones/15')
    expect(adapter.mock.calls[0][0].method).toBe('delete')
    await expect(eliminarPublicacion('')).rejects.toBeInstanceOf(TypeError)
  })

  it('envía el reporte con motivo, descripción y publicación', async () => {
    const adapter = adapterQueResponde({ idReporte: 4 })
    api.defaults.adapter = adapter
    await crearReporte({ publicacionId: 9, motivo: 'SPAM', descripcion: '  Publicidad recurrente  ' })
    const config = adapter.mock.calls[0][0]
    expect(config.url).toBe('/api/reportes')
    expect(JSON.parse(config.data)).toEqual({ publicacionId: 9, motivo: 'SPAM', descripcion: 'Publicidad recurrente' })

    await crearReporte({ publicacionId: 9, motivo: 'OTRO', descripcion: '' })
    expect(JSON.parse(adapter.mock.calls[1][0].data).descripcion).toBeNull()
    await expect(crearReporte({ motivo: 'SPAM' })).rejects.toBeInstanceOf(TypeError)
  })
})
