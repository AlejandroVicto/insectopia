// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import api from '../../services/api'
import ReportarPublicacionModal from './ReportarPublicacionModal'

const originalAdapter = api.defaults.adapter
const publicacion = { id: 8, contenido: 'Publicación a revisar' }
const reporte = { idReporte: 3, estado: 'PENDIENTE' }

afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter })

function respuesta(config) {
  return Promise.resolve({ status: 201, data: reporte, config, headers: {} })
}

function renderModal(props = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(<ReportarPublicacionModal open publicacion={publicacion} onClose={onClose} onSuccess={onSuccess} {...props} />)
  return { onClose, onSuccess }
}

describe('ReportarPublicacionModal', () => {
  it('ofrece un selector real de motivos y cierra con cancelar y Escape', () => {
    const { onClose } = renderModal()
    const selector = screen.getByLabelText('Motivo del reporte')
    expect(selector.tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'Spam o publicidad' }).value).toBe('SPAM')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('valida motivo y descripción con errores vinculados por aria-describedby', () => {
    const adapter = vi.fn(respuesta)
    api.defaults.adapter = adapter
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    const selector = screen.getByLabelText('Motivo del reporte')
    const descripcion = screen.getByLabelText('Descripción del problema')
    expect(selector.getAttribute('aria-describedby')).toContain('reportar-motivo-error')
    expect(descripcion.getAttribute('aria-describedby')).toContain('reportar-descripcion-error')
    expect(screen.getByText('Selecciona un motivo para el reporte.')).toBeTruthy()
    expect(screen.getByText('Describe el problema para que el equipo de moderación pueda revisarlo.')).toBeTruthy()

    fireEvent.change(selector, { target: { value: 'SPAM' } })
    fireEvent.change(descripcion, { target: { value: 'corto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    expect(screen.getByText(/al menos 10 caracteres/)).toBeTruthy()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('envía el reporte real y solo llama al callback tras la confirmación', async () => {
    const adapter = vi.fn(respuesta)
    api.defaults.adapter = adapter
    const { onClose, onSuccess } = renderModal()
    fireEvent.change(screen.getByLabelText('Motivo del reporte'), { target: { value: 'IMAGEN_NO_RELACIONADA' } })
    fireEvent.change(screen.getByLabelText('Descripción del problema'), {
      target: { value: 'La imagen adjunta no corresponde a ningún insecto observado.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(reporte, publicacion))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0].url).toBe('/api/reportes')
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({
      publicacionId: 8,
      motivo: 'IMAGEN_NO_RELACIONADA',
      descripcion: 'La imagen adjunta no corresponde a ningún insecto observado.',
    })
  })

  it('mantiene el modal abierto con el error del servidor', async () => {
    api.defaults.adapter = (config) => Promise.reject(Object.assign(new Error('fallo'), {
      config,
      response: { status: 403, data: { message: 'No puedes reportar esta publicación.' }, config },
    }))
    const { onClose, onSuccess } = renderModal()
    fireEvent.change(screen.getByLabelText('Motivo del reporte'), { target: { value: 'SPAM' } })
    fireEvent.change(screen.getByLabelText('Descripción del problema'), {
      target: { value: 'Publicidad repetida en varias publicaciones del feed.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('No puedes reportar esta publicación.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('muestra estado de carga y bloquea envíos repetidos', async () => {
    let resolver
    const adapter = vi.fn(() => new Promise((resolve) => { resolver = resolve }))
    api.defaults.adapter = adapter
    const { onSuccess } = renderModal()
    fireEvent.change(screen.getByLabelText('Motivo del reporte'), { target: { value: 'OTRO' } })
    fireEvent.change(screen.getByLabelText('Descripción del problema'), {
      target: { value: 'Contenido que requiere revisión por el equipo de moderación.' },
    })
    const boton = screen.getByRole('button', { name: 'Enviar reporte' })
    fireEvent.click(boton)
    fireEvent.click(boton)
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Enviando…' }).disabled).toBe(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()

    resolver({ status: 201, data: reporte, config: {}, headers: {} })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })
})
