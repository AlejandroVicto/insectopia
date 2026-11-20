// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { obtenerPaises, obtenerRegiones } from './catalogoService'

const adaptadorOriginal = api.defaults.adapter

afterEach(() => { api.defaults.adapter = adaptadorOriginal })

describe('catálogo público', () => {
  it('carga países y regiones sin token y devuelve datos de la API', async () => {
    const adaptador = vi.fn((config) => Promise.resolve({
      data: config.url.endsWith('/regiones') ? [{ nombre: 'Oaxaca' }] : [{ codigo: 'MX', nombre: 'México' }],
      status: 200, statusText: 'OK', headers: {}, config,
    }))
    api.defaults.adapter = adaptador

    expect(await obtenerPaises()).toEqual([{ codigo: 'MX', nombre: 'México' }])
    expect(await obtenerRegiones('MX')).toEqual([{ nombre: 'Oaxaca' }])
    expect(adaptador.mock.calls.map(([config]) => config.url)).toEqual([
      '/api/catalogos/paises', '/api/catalogos/paises/MX/regiones',
    ])
    for (const [config] of adaptador.mock.calls) {
      expect(config.skipAuth).toBe(true)
      expect(config.headers.get('Authorization')).toBeUndefined()
    }
  })
})
