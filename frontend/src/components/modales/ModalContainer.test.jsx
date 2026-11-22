// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ModalContainer from './ModalContainer'

afterEach(() => { cleanup(); document.body.style.overflow = '' })

function renderContainer(props = {}) {
  return render(
    <ModalContainer
      titleId="dialogo-titulo"
      descriptionId="dialogo-descripcion"
      title="Título accesible"
      description="Descripción accesible"
      onClose={vi.fn()}
      closeLabel="Cerrar diálogo"
      {...props}
    >
      <button type="button" data-modal-autofocus="">Primero</button>
      <button type="button">Segundo</button>
    </ModalContainer>,
  )
}

describe('ModalContainer', () => {
  it('expone diálogo modal con título y descripción accesibles', () => {
    renderContainer()
    const dialog = screen.getByRole('dialog', { name: 'Título accesible', description: 'Descripción accesible' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe('dialogo-titulo')
    expect(dialog.getAttribute('aria-describedby')).toBe('dialogo-descripcion')
  })

  it('cierra con Escape y con clic en el fondo, pero no con clic dentro', () => {
    const onClose = vi.fn()
    renderContainer({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    const overlay = document.querySelector('[data-modal-overlay]')
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Primero' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.mouseDown(overlay)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('no cierra con Escape mientras la operación está bloqueada', () => {
    const onClose = vi.fn()
    renderContainer({ onClose, closeDisabled: true })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cerrar diálogo' }).disabled).toBe(true)
  })

  it('atrapa el foco con Tab y lo devuelve al opening element al desmontar', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    renderContainer()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Primero' }))

    const cerrar = screen.getByRole('button', { name: 'Cerrar diálogo' })
    const segundo = screen.getByRole('button', { name: 'Segundo' })
    segundo.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(cerrar)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(segundo)

    cleanup()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('impide el scroll del fondo mientras está abierto', () => {
    expect(document.body.style.overflow).not.toBe('hidden')
    renderContainer()
    expect(document.body.style.overflow).toBe('hidden')
    cleanup()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('envuelve el contenido en un cuerpo flex sin fijar altura por defecto', () => {
    renderContainer()
    const dialog = screen.getByRole('dialog', { name: 'Título accesible' })
    const contenido = dialog.querySelector('[data-modal-content]')

    expect(contenido).toBeTruthy()
    expect(contenido.parentElement).toBe(dialog)
    expect(contenido.className).toContain('min-h-0')
    expect(contenido.className).toContain('flex-1')
    expect(dialog.style.height).toBe('')
    expect(dialog.style.maxHeight).toBe('')
  })

  it('aplica una altura explícita sólo cuando el modal la solicita', () => {
    renderContainer({ alto: '700px' })
    const dialog = screen.getByRole('dialog', { name: 'Título accesible' })
    expect(dialog.style.height).toBe('700px')
    expect(dialog.style.maxHeight).toBe('700px')
  })
})
