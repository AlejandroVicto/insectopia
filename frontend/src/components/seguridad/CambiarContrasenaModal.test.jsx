// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import CambiarContrasenaModal from './CambiarContrasenaModal'

const VALIDOS = {
  contrasenaActual: 'ClaveActual1!',
  contrasenaNueva: 'ClaveNueva2!',
  confirmarContrasena: 'ClaveNueva2!',
}

const submitResuelto = () => vi.fn().mockResolvedValue({ requiereReautenticacion: false })

function renderModal({
  onSubmit = submitResuelto(),
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onReauth = vi.fn(),
  ...props
} = {}) {
  const opener = document.createElement('button')
  opener.type = 'button'
  opener.textContent = 'Abrir seguridad'
  document.body.appendChild(opener)
  opener.focus()

  const vista = render(
    <CambiarContrasenaModal
      correo="maria@test.invalid"
      alias="maria"
      onClose={onClose}
      onSuccess={onSuccess}
      onReauth={onReauth}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { vista, opener, onSubmit, onClose, onSuccess, onReauth }
}

function llenarFormulario(valores = VALIDOS) {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: valores.contrasenaActual } })
  fireEvent.change(screen.getByLabelText('Contraseña nueva'), { target: { value: valores.contrasenaNueva } })
  fireEvent.change(screen.getByLabelText('Repetir contraseña nueva'), { target: { value: valores.confirmarContrasena } })
}

function errorServicio(codigo, message, fieldErrors = {}) {
  return Object.assign(new Error(message), { codigo, fieldErrors })
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('CambiarContrasenaModal - actividad 079', () => {
  it('es un diálogo accesible, centrado, con ancho máximo y foco inicial', () => {
    const { opener } = renderModal()
    const dialog = screen.getByRole('dialog', {
      name: 'Cambiar contraseña',
      description: /Usarás esta contraseña para iniciar sesión/,
    })

    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe('seguridad-cambiar-titulo')
    expect(dialog.getAttribute('aria-describedby')).toBe('seguridad-cambiar-descripcion')
    expect(dialog.style.maxWidth).toBe('530px')
    expect(dialog.className).toContain('seguridad-modal')
    expect(document.activeElement).toBe(screen.getByLabelText('Contraseña actual'))

    cleanup()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('mantiene el correo completo accesible aunque el layout lo trunque', () => {
    const correoLargo = 'maria.victoria.alvarez@correo.largo.invalid'
    const { opener } = renderModal({ correo: correoLargo })
    const correo = screen.getByText(correoLargo)

    expect(correo.parentElement.className).toContain('seguridad-cuenta-datos')
    expect(correo.getAttribute('title')).toBe(correoLargo)
    expect(correo.getAttribute('aria-label')).toBe(`Correo de la cuenta: ${correoLargo}`)
    opener.remove()
  })

  it('cierra con Escape y con Cancelar cuando no hay valores escritos', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    cleanup()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('avisa antes de descartar contraseñas escritas y conserva el diálogo', () => {
    const { onClose } = renderModal()
    fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'texto temporal' } })

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText(/Los valores escritos se borrarán al cerrar/)).toBeTruthy()
    expect(screen.getByLabelText('Contraseña actual').value).toBe('texto temporal')

    fireEvent.click(screen.getByRole('button', { name: 'Mantener abierto' }))
    expect(screen.queryByText(/Los valores escritos se borrarán al cerrar/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText(/Los valores escritos se borrarán al cerrar/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar y cerrar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('exige los tres campos antes de enviar', () => {
    const { onSubmit } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(screen.getByText('Ingresa tu contraseña actual.')).toBeTruthy()
    expect(screen.getByText('La contraseña nueva es obligatoria.')).toBeTruthy()
    expect(screen.getByText('Confirma tu contraseña nueva.')).toBeTruthy()
    expect(screen.getByText('Revisa los campos marcados antes de continuar.')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('valida los requisitos de la contraseña nueva y la coincidencia', () => {
    const { onSubmit } = renderModal()
    llenarFormulario({
      contrasenaActual: VALIDOS.contrasenaActual,
      contrasenaNueva: 'abc',
      confirmarContrasena: 'abc',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(screen.getByText('Debe tener al menos 8 caracteres.')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Contraseña nueva'), { target: { value: VALIDOS.contrasenaNueva } })
    fireEvent.change(screen.getByLabelText('Repetir contraseña nueva'), { target: { value: 'OtraClave3!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('muestra los requisitos vigentes y los marca al cumplirlos', () => {
    renderModal()
    const requisitos = screen.getByText('Cómo crear una contraseña segura').parentElement
    expect(within(requisitos).getByText('Al menos 8 caracteres.')).toBeTruthy()
    expect(within(requisitos).getByText('Una letra mayúscula.')).toBeTruthy()
    expect(within(requisitos).getByText('Un número.')).toBeTruthy()
    expect(within(requisitos).getByText('Un carácter especial.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Contraseña nueva'), { target: { value: VALIDOS.contrasenaNueva } })
    expect(within(requisitos).getByText('Al menos 8 caracteres.').className).toContain('seguridad-requisito--ok')
  })

  it('permite mostrar y ocultar cada contraseña', () => {
    renderModal()
    const actual = screen.getByLabelText('Contraseña actual')
    expect(actual.type).toBe('password')
    expect(actual.className).toBe('seguridad-input')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña actual' }))
    expect(actual.type).toBe('text')
    expect(actual.className).toBe('seguridad-input')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña actual' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña actual' }))
    expect(actual.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar confirmación' }))
    expect(screen.getByLabelText('Repetir contraseña nueva').type).toBe('text')
  })

  it('bloquea el cierre y el doble envío mientras la petición está en curso', async () => {
    let resolver
    const onSubmit = vi.fn(() => new Promise((resolve) => { resolver = resolve }))
    renderModal({ onSubmit })
    llenarFormulario()

    const boton = screen.getByRole('button', { name: 'Cambiar contraseña' })
    fireEvent.click(boton)
    fireEvent.click(boton)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Cambiando…' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Cerrar cambio de contraseña' }).disabled).toBe(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await act(async () => { resolver({ requiereReautenticacion: false }) })
    expect(await screen.findByText('Tu contraseña se actualizó correctamente.')).toBeTruthy()
  })

  it('muestra el error de contraseña actual incorrecta junto al campo', async () => {
    const onSubmit = vi.fn().mockRejectedValue(errorServicio(
      'validacion',
      'Revisa los campos marcados.',
      { contrasenaActual: 'La contraseña actual no es correcta.' },
    ))
    renderModal({ onSubmit })
    llenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeTruthy()
    const actual = screen.getByLabelText('Contraseña actual')
    expect(actual.getAttribute('aria-invalid')).toBe('true')
    expect(actual.getAttribute('aria-describedby')).toContain('seguridad-contrasena-actual-error')
    expect(document.body.textContent).not.toContain(VALIDOS.contrasenaActual)
    expect(document.body.textContent).not.toContain(VALIDOS.contrasenaNueva)
  })

  it('informa cuando el backend 080 todavía no está disponible', async () => {
    const onSubmit = vi.fn().mockRejectedValue(errorServicio(
      'contrato_pendiente',
      'El cambio de contraseña estará disponible cuando el backend 080 publique su contrato. Tus contraseñas no se enviaron.',
    ))
    renderModal({ onSubmit })
    llenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText(/backend 080 publique su contrato/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ir a iniciar sesión' })).toBeNull()
  })

  it('solicita nueva autenticación solo cuando la respuesta lo exige', async () => {
    const onReauth = vi.fn()
    const onSubmit = vi.fn().mockRejectedValue(errorServicio(
      'sesion_expirada',
      'Tu sesión ya no es válida. Inicia sesión nuevamente.',
    ))
    renderModal({ onSubmit, onReauth })
    llenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    const reautenticar = await screen.findByRole('button', { name: 'Ir a iniciar sesión' })
    expect(onReauth).not.toHaveBeenCalled()
    fireEvent.click(reautenticar)
    expect(onReauth).toHaveBeenCalledTimes(1)
  })

  it('limpia las contraseñas tras el éxito simulado y no ofrece acciones no aprobadas', async () => {
    const onSuccess = vi.fn()
    const onSubmit = vi.fn().mockResolvedValue({ requiereReautenticacion: false })
    renderModal({ onSubmit, onSuccess })
    llenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('Tu contraseña se actualizó correctamente.')).toBeTruthy()
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Contraseña actual').value).toBe('')
    expect(screen.getByLabelText('Contraseña nueva').value).toBe('')
    expect(screen.getByLabelText('Repetir contraseña nueva').value).toBe('')
    expect(document.body.textContent).not.toContain(VALIDOS.contrasenaActual)
    expect(document.body.textContent).not.toContain(VALIDOS.contrasenaNueva)
    expect(screen.queryByRole('button', { name: /desactivar/i })).toBeNull()

    const recuperacion = screen.getByText(/¿Olvidaste tu contraseña\?/)
    expect(['BUTTON', 'A']).not.toContain(recuperacion.tagName)
  })

  it('no escribe contraseñas en almacenamiento ni en la consola', async () => {
    const guardar = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorConsola = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const onSubmit = vi.fn().mockRejectedValue(errorServicio('servidor', 'Error del servidor.'))
      renderModal({ onSubmit })
      llenarFormulario()
      fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
      await waitFor(() => expect(screen.getByText('Error del servidor.')).toBeTruthy())

      expect(guardar).not.toHaveBeenCalled()
      expect(log.mock.calls.flat().join(' ')).not.toContain(VALIDOS.contrasenaNueva)
      expect(errorConsola.mock.calls.flat().join(' ')).not.toContain(VALIDOS.contrasenaNueva)
    } finally {
      guardar.mockRestore()
      log.mockRestore()
      errorConsola.mockRestore()
    }
  })
})
