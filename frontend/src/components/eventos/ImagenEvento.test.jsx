// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import api from '../../services/api'
import ImagenEvento from './ImagenEvento'

const adapterOriginal = api.defaults.adapter
afterEach(() => { cleanup(); api.defaults.adapter = adapterOriginal })

describe('imagen de evento', () => {
  it('muestra imágenes aprobadas directamente y solicita las pendientes con JWT', async () => {
    const adapter = vi.fn((config) => Promise.resolve({ config, status: 200, data: new Blob(['foto'], { type: 'image/png' }) }))
    api.defaults.adapter = adapter
    const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:privada')
    const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    try {
      const aprobada = { id: 8, estado: 'APROBADO', imagenUrl: '/api/eventos/8/imagen' }
      const { rerender, unmount } = render(<ImagenEvento evento={aprobada} alt="Foto" />)
      expect(screen.getByAltText('Foto').getAttribute('src')).toBe('/api/eventos/8/imagen')
      expect(adapter).not.toHaveBeenCalled()
      rerender(<ImagenEvento evento={{ ...aprobada, estado: 'PENDIENTE' }} alt="Foto" />)
      await waitFor(() => expect(screen.getByAltText('Foto').getAttribute('src')).toBe('blob:privada'))
      expect(adapter.mock.calls[0][0].url).toBe('/api/eventos/8/imagen')
      expect(adapter.mock.calls[0][0].responseType).toBe('blob')
      unmount()
      expect(revocar).toHaveBeenCalledWith('blob:privada')
    } finally {
      crear.mockRestore()
      revocar.mockRestore()
    }
  })
})
