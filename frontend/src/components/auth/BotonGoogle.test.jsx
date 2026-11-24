// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import BotonGoogle from './BotonGoogle'
import { obtenerConfiguracionGoogle, redirigirAGoogle } from '../../services/googleService'

vi.mock('../../services/googleService', () => ({
  obtenerConfiguracionGoogle: vi.fn(),
  redirigirAGoogle: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('BotonGoogle', () => {
  it('habilita el botón solo cuando el backend confirma la configuración', async () => {
    obtenerConfiguracionGoogle.mockResolvedValue({
      enabled: true,
      loginUrl: '/oauth2/authorization/google',
    })

    render(<BotonGoogle />)

    const boton = await screen.findByRole('button', { name: 'Continuar con Google' })
    await waitFor(() => expect(boton.disabled).toBe(false))
    expect(await screen.findByText(/continuarás a google para autorizar/i)).toBeTruthy()

    fireEvent.click(boton)

    expect(redirigirAGoogle).toHaveBeenCalledWith('/oauth2/authorization/google')
  })

  it('deshabilita el botón y explica por qué Google no está disponible', async () => {
    obtenerConfiguracionGoogle.mockResolvedValue({ enabled: false, loginUrl: '/oauth2/authorization/google' })

    render(<BotonGoogle />)

    await screen.findByText(/google estará disponible cuando se integre oauth/i)
    const boton = screen.getByRole('button', { name: /no disponible/i })
    expect(boton.disabled).toBe(true)

    fireEvent.click(boton)

    expect(redirigirAGoogle).not.toHaveBeenCalled()
  })

  it('no redirige si la consulta de configuración falla', async () => {
    obtenerConfiguracionGoogle.mockRejectedValue(new Error('sin backend'))

    render(<BotonGoogle />)

    await screen.findByText(/google estará disponible cuando se integre oauth/i)
    expect(screen.getByRole('button', { name: /no disponible/i }).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /no disponible/i }))

    expect(redirigirAGoogle).not.toHaveBeenCalled()
  })

  it('muestra un error accesible si la URL devuelta no es válida', async () => {
    obtenerConfiguracionGoogle.mockResolvedValue({ enabled: true, loginUrl: '/oauth2/authorization/google' })
    redirigirAGoogle.mockImplementation(() => { throw new Error('URL inválida') })

    render(<BotonGoogle />)

    const boton = await screen.findByRole('button', { name: 'Continuar con Google' })
    await waitFor(() => expect(boton.disabled).toBe(false))
    fireEvent.click(boton)

    expect(screen.getByText(/no se pudo iniciar el acceso con google/i)).toBeTruthy()
  })
})
