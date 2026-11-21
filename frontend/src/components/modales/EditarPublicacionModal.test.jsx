// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import api from '../../services/api'
import EditarPublicacionModal from './EditarPublicacionModal'

const originalAdapter = api.defaults.adapter
const originalCreate = URL.createObjectURL
const originalRevoke = URL.revokeObjectURL
const publicacion = {
  id: 24,
  contenido: 'Encontré un escarabajo metálico bajo las hojas del encino.',
  imagenUrl: 'https://imagenes.test/coleoptera.jpg',
  autor: { id: 7, nombre: 'María' },
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:editar')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  api.defaults.adapter = originalAdapter
  URL.createObjectURL = originalCreate
  URL.revokeObjectURL = originalRevoke
})

function respuesta(config, data = { ...publicacion, contenido: 'Contenido actualizado' }) {
  return Promise.resolve({ status: 200, data, config, headers: {} })
}

function fallo(config, status, data) {
  return Promise.reject(Object.assign(new Error('fallo HTTP'), { config, response: { status, data, config } }))
}

function renderModal(props = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(<EditarPublicacionModal open publicacion={publicacion} onClose={onClose} onSuccess={onSuccess} {...props} />)
  return { onClose, onSuccess }
}

describe('EditarPublicacionModal', () => {
  it('carga los datos reales recibidos por props', () => {
    renderModal()
    expect(screen.getByRole('dialog', { name: 'Editar publicación' })).toBeTruthy()
    expect(screen.getByLabelText('Notas de campo y morfología').value).toBe(publicacion.contenido)
    expect(screen.getByText(/Publicación 24 · María/)).toBeTruthy()
    expect(screen.getByText(/Solo el autor o un administrador autorizado/)).toBeTruthy()
  })

  it('muestra validaciones bajo el campo y no envía un contenido inválido', () => {
    const adapter = vi.fn(respuesta)
    api.defaults.adapter = adapter
    renderModal()
    const campo = screen.getByLabelText('Notas de campo y morfología')
    fireEvent.change(campo, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(screen.getByText('Escribe tus notas de campo antes de guardar.')).toBeTruthy()
    expect(campo.getAttribute('aria-describedby')).toContain('editar-contenido-error')
    expect(adapter).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('envía únicamente contenido admitido y notifica al callback después del éxito', async () => {
    const adapter = vi.fn(respuesta)
    api.defaults.adapter = adapter
    const { onClose, onSuccess } = renderModal()
    const campo = screen.getByLabelText('Notas de campo y morfología')
    fireEvent.change(campo, { target: { value: 'Nueva descripción de la observación de campo.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const datos = { ...publicacion, contenido: 'Contenido actualizado' }
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(datos, publicacion))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0].url).toBe('/api/publicaciones/24')
    expect(adapter.mock.calls[0][0].method).toBe('put')
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ contenido: 'Nueva descripción de la observación de campo.' })
  })

  it.each([
    [403, 'No tienes permisos para realizar esta acción.'],
    [404, 'La publicación ya no existe o fue eliminada.'],
  ])('permanece abierto y muestra el error %i del servidor', async (status, mensaje) => {
    api.defaults.adapter = (config) => fallo(config, status, { message: mensaje })
    const { onClose, onSuccess } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(mensaje)).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('muestra error de conexión y permite reintentar', async () => {
    api.defaults.adapter = () => Promise.reject(Object.assign(new Error('sin red'), { config: {} }))
    const { onSuccess } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText(/No se pudo conectar con el backend/)).toBeTruthy()

    api.defaults.adapter = respuesta
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('deshabilita la edición si el usuario no está autorizado', () => {
    renderModal({ puedeEditar: false })
    expect(screen.getByLabelText('Notas de campo y morfología').disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Guardar cambios' }).disabled).toBe(true)
    expect(screen.getByText(/No tienes autorización/)).toBeTruthy()
  })

  it('impide guardar dos veces mientras la primera petición sigue pendiente', async () => {
    let resolver
    const adapter = vi.fn(() => new Promise((resolve) => { resolver = resolve }))
    api.defaults.adapter = adapter
    const { onSuccess } = renderModal()
    const boton = screen.getByRole('button', { name: 'Guardar cambios' })
    fireEvent.click(boton)
    fireEvent.click(boton)
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Guardando…' }).disabled).toBe(true)

    resolver({ status: 200, data: publicacion, config: {}, headers: {} })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })
})
