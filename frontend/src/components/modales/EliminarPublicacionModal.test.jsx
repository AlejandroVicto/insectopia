// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import api from '../../services/api'
import EliminarPublicacionModal from './EliminarPublicacionModal'

const originalAdapter = api.defaults.adapter
const publicacion = {
  id: 42,
  contenido: 'Hallazgo de escarabajo metálico en encino.',
  autor: { nombre: 'Alejandra' },
  fechaPublicacion: '2026-11-20T08:00:00',
}

afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter })

function respuesta(config) {
  return Promise.resolve({ status: 204, data: '', config, headers: {} })
}

function fallo(config, status, data) {
  return Promise.reject(Object.assign(new Error('fallo HTTP'), { config, response: { status, data, config } }))
}

function renderModal(props = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(<EliminarPublicacionModal open publicacion={publicacion} onClose={onClose} onSuccess={onSuccess} {...props} />)
  return { onClose, onSuccess }
}

describe('EliminarPublicacionModal', () => {
  it('muestra el resumen y pide confirmación dentro del diálogo', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    renderModal()
    expect(screen.getByRole('dialog', { name: 'Eliminar publicación' })).toBeTruthy()
    expect(screen.getByText(publicacion.contenido)).toBeTruthy()
    expect(screen.getByText(/Alejandra/)).toBeTruthy()
    expect(screen.getByText(/Identificador: 42/)).toBeTruthy()
    expect(screen.getByText('¿Seguro que deseas eliminar esta publicación?')).toBeTruthy()
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('cancela sin llamar a la API', () => {
    const adapter = vi.fn(respuesta)
    api.defaults.adapter = adapter
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('solo confirma el éxito después de la respuesta del servidor', async () => {
    const adapter = vi.fn(respuesta)
    api.defaults.adapter = adapter
    const { onClose, onSuccess } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar publicación' }))

    expect(onSuccess).not.toHaveBeenCalled()
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(publicacion))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0].url).toBe('/api/publicaciones/42')
    expect(adapter.mock.calls[0][0].method).toBe('delete')
  })

  it.each([
    [403, 'No tienes permisos para realizar esta acción.'],
    [404, 'La publicación ya no existe o fue eliminada.'],
  ])('gestiona el error HTTP %i sin eliminar localmente', async (status, mensaje) => {
    api.defaults.adapter = (config) => fallo(config, status, { message: mensaje })
    const { onClose, onSuccess } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar publicación' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(mensaje)).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('gestiona la pérdida de conexión', async () => {
    api.defaults.adapter = () => Promise.reject(Object.assign(new Error('sin red'), { config: {} }))
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar publicación' }))
    expect(await screen.findByText(/No se pudo conectar con el backend/)).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('bloquea confirmaciones repetidas y Escape durante la operación irreversible', async () => {
    let resolver
    const adapter = vi.fn(() => new Promise((resolve) => { resolver = resolve }))
    api.defaults.adapter = adapter
    const { onClose, onSuccess } = renderModal()
    const boton = screen.getByRole('button', { name: 'Eliminar publicación' })
    fireEvent.click(boton)
    fireEvent.click(boton)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Eliminando…' }).disabled).toBe(true)

    resolver({ status: 204, data: '', config: {}, headers: {} })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })
})
