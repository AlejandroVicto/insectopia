// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  CAMPO_IMAGEN_FORMDATA,
  actualizarPublicacion,
  crearPublicacion,
  eliminarPublicacion,
  prepararFormDataPublicacion,
  subirImagenPublicacion,
  quitarImagenPublicacion,
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
    await crearPublicacion({ contenido: '  Observación de campo  ', titulo: 'no admitido' })
    const config = adapter.mock.calls[0][0]
    expect(config.url).toBe('/api/publicaciones')
    expect(config.method).toBe('post')
    expect(JSON.parse(config.data)).toEqual({ contenido: 'Observación de campo' })
    await expect(crearPublicacion({ contenido: 'texto', imagen: 'https://img.test/a.jpg' })).rejects.toBeInstanceOf(TypeError)
  })

  it('rechaza crear contenido vacío sin llamar a la API', async () => {
    const adapter = adapterQueResponde({})
    api.defaults.adapter = adapter
    await expect(crearPublicacion({ contenido: '   ' })).rejects.toBeInstanceOf(TypeError)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('prepara FormData solo con el archivo, sin contactar al backend', () => {
    const adapter = adapterQueResponde({})
    api.defaults.adapter = adapter
    const archivo = new File([new Uint8Array([1, 2, 3])], 'macro.jpg', { type: 'image/jpeg' })
    const datos = prepararFormDataPublicacion({ contenido: '  Observación de campo  ', imagen: archivo })

    expect(CAMPO_IMAGEN_FORMDATA).toBe('imagen')
    expect(datos.has('contenido')).toBe(false)
    const adjunto = datos.get('imagen')
    expect(adjunto).toBeInstanceOf(File)
    expect(adjunto.name).toBe('macro.jpg')
    expect(adjunto.type).toBe('image/jpeg')
    expect(adjunto.size).toBe(3)
    expect(() => prepararFormDataPublicacion({ contenido: 'texto' })).toThrow(TypeError)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('sube y quita la fotografía al ID existente sin serializar el archivo como JSON', async () => {
    const adapter = adapterQueResponde({ id: 24, imagenUrl: '/api/publicaciones/24/imagen' })
    api.defaults.adapter = adapter
    const imagen = new File([new Uint8Array([1, 2])], 'macro.png', { type: 'image/png' })
    await subirImagenPublicacion(24, imagen)
    const config = adapter.mock.calls[0][0]
    expect(config.url).toBe('/api/publicaciones/24/imagen')
    expect(config.method).toBe('post')
    expect(config.data).toBeInstanceOf(FormData)
    expect(config.data.get('imagen').name).toBe('macro.png')
    expect(config.data.has('contenido')).toBe(false)
    expect(config.headers.get('Content-Type')).not.toBe('application/json')
    await quitarImagenPublicacion(24)
    expect(adapter.mock.calls[1][0].method).toBe('delete')
    expect(adapter.mock.calls[1][0].url).toBe('/api/publicaciones/24/imagen')
    await expect(subirImagenPublicacion(null, imagen)).rejects.toBeInstanceOf(TypeError)
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
    await expect(actualizarPublicacion(24, { contenido: 'texto', imagen: 'https://ejemplo.test/img.jpg' })).rejects.toBeInstanceOf(TypeError)
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
