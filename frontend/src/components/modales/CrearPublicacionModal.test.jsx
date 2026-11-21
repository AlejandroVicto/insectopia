// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import api from '../../services/api'
import CrearPublicacionModal from './CrearPublicacionModal'

const originalAdapter = api.defaults.adapter
const originalCreate = URL.createObjectURL
const originalRevoke = URL.revokeObjectURL
const publicacion = { id: 11, contenido: 'Hallazgo confirmado', estado: 'VISIBLE' }

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:vista-previa')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  api.defaults.adapter = originalAdapter
  URL.createObjectURL = originalCreate
  URL.revokeObjectURL = originalRevoke
})

function respuesta(config, data = publicacion) {
  return Promise.resolve({ status: 201, data, config, headers: {} })
}

function renderModal(props = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(<CrearPublicacionModal open onClose={onClose} onSuccess={onSuccess} {...props} />)
  return { onClose, onSuccess }
}

function archivo(type = 'image/jpeg', size = 1024, name = 'macro.jpg') {
  return new File([new Uint8Array(size)], name, { type })
}

function seleccionarImagen(input, file = archivo()) {
  fireEvent.change(input, { target: { files: [file] } })
}

describe('CrearPublicacionModal', () => {
  it('no renderiza cuando open es falso y expone diálogo accesible cuando está abierto', () => {
    const { container } = render(<CrearPublicacionModal open={false} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()

    cleanup()
    renderModal()
    expect(screen.getByRole('dialog', { name: 'Registrar observación' })).toBeTruthy()
    expect(screen.getByText('Publica tu nuevo hallazgo entomológico en la red científica')).toBeTruthy()
  })

  it('cierra con cancelar, botón de cierre y Escape', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar nueva publicación' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('valida texto vacío y demasiado corto con mensaje vinculado al campo', () => {
    const adapter = vi.fn(respuesta)
    api.defaults.adapter = adapter
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Publicar hallazgo' }))
    const campo = screen.getByLabelText('Notas de campo y morfología')
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(campo.getAttribute('aria-describedby')).toContain('crear-contenido-error')
    expect(screen.getByText('Escribe tus notas de campo antes de publicar.')).toBeTruthy()

    fireEvent.change(campo, { target: { value: 'Muy corto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar hallazgo' }))
    expect(screen.getByText(/al menos 10 caracteres/)).toBeTruthy()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('muestra los campos propuestos como no enviables', () => {
    renderModal()
    expect(screen.getByLabelText('Orden taxonómico principal').disabled).toBe(true)
    expect(screen.getByLabelText('Nivel de certeza taxonómica').disabled).toBe(true)
    expect(screen.getByLabelText('Ubicación de muestreo').disabled).toBe(true)
    expect(screen.getByLabelText('Visibilidad del registro').disabled).toBe(true)
    expect(screen.getByText(/no las admite y no se enviarán/)).toBeTruthy()
  })

  it('selecciona y previsualiza una imagen válida, prepara FormData y bloquea el envío hasta quitarla', () => {
    const adapter = vi.fn(respuesta)
    api.defaults.adapter = adapter
    renderModal()
    fireEvent.change(screen.getByLabelText('Notas de campo y morfología'), {
      target: { value: 'Escarabajo metálico encontrado bajo hojas de encino.' },
    })

    seleccionarImagen(screen.getByLabelText(/Captura macro/))
    expect(screen.getByRole('img', { name: 'Vista previa de macro.jpg' }).getAttribute('src')).toBe('blob:vista-previa')
    expect(screen.getByRole('button', { name: 'Publicar hallazgo' }).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('Quita la imagen')
    expect(screen.getByText(/FormData preparado/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar imagen' }))
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByText(/FormData preparado/)).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vista-previa')
    expect(screen.getByRole('button', { name: 'Publicar hallazgo' }).disabled).toBe(false)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('sustituye la imagen y muestra la vista previa del archivo nuevo', () => {
    URL.createObjectURL = vi.fn().mockReturnValueOnce('blob:primero').mockReturnValueOnce('blob:segundo')
    renderModal()
    const input = screen.getByLabelText(/Captura macro/)
    seleccionarImagen(input, archivo('image/jpeg', 1024, 'primero.jpg'))
    expect(screen.getByRole('img', { name: 'Vista previa de primero.jpg' }).getAttribute('src')).toBe('blob:primero')

    fireEvent.click(screen.getByRole('button', { name: 'Sustituir imagen' }))
    expect(document.activeElement).toBe(input)

    seleccionarImagen(input, archivo('image/png', 2048, 'segundo.png'))
    const nueva = screen.getByRole('img', { name: 'Vista previa de segundo.png' })
    expect(nueva.getAttribute('src')).toBe('blob:segundo')
    expect(screen.queryByRole('img', { name: 'Vista previa de primero.jpg' })).toBeNull()
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:primero')
    expect(screen.getByRole('button', { name: 'Publicar hallazgo' }).disabled).toBe(true)
  })

  it('rechaza formatos no soportados y archivos demasiado grandes', () => {
    renderModal()
    const input = screen.getByLabelText(/Captura macro/)
    seleccionarImagen(input, archivo('image/x-adobe-dng', 1024, 'crudo.dng'))
    expect(screen.getByText(/RAW no está implementado/)).toBeTruthy()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.queryByRole('img')).toBeNull()

    seleccionarImagen(input, archivo('image/png', 6 * 1024 * 1024, 'grande.png'))
    expect(screen.getByText(/no puede superar los 5 MB/)).toBeTruthy()
  })

  it('envía solo contenido tras éxito y dispara onSuccess y onClose', async () => {
    const adapter = vi.fn(respuesta)
    api.defaults.adapter = adapter
    const { onSuccess, onClose } = renderModal()
    fireEvent.change(screen.getByLabelText('Notas de campo y morfología'), {
      target: { value: '  Escarabajo metálico bajo hojas de encino, activo al atardecer.  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar hallazgo' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(publicacion))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({
      contenido: 'Escarabajo metálico bajo hojas de encino, activo al atardecer.',
    })
  })

  it('mantiene el diálogo abierto y muestra el error de red', async () => {
    api.defaults.adapter = () => Promise.reject(Object.assign(new Error('sin red'), { config: {} }))
    const { onSuccess, onClose } = renderModal()
    fireEvent.change(screen.getByLabelText('Notas de campo y morfología'), {
      target: { value: 'Observación de campo suficientemente detallada.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar hallazgo' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(/No se pudo conectar con el backend/)).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('bloquea envíos repetidos mientras la petición está en curso', async () => {
    let resolver
    const { onSuccess } = renderModal()
    const adapter = vi.fn(() => new Promise((resolve) => { resolver = resolve }))
    api.defaults.adapter = adapter
    fireEvent.change(screen.getByLabelText('Notas de campo y morfología'), {
      target: { value: 'Observación de campo suficientemente detallada.' },
    })
    const boton = screen.getByRole('button', { name: 'Publicar hallazgo' })
    fireEvent.click(boton)
    fireEvent.click(boton)
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1))

    resolver({ status: 201, data: publicacion, config: {}, headers: {} })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })
})
