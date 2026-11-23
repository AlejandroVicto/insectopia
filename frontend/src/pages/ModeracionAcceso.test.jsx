// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import App from '../App'
import * as moderacion from '../services/moderacionService'
import * as reportes from '../services/reportesService'

vi.mock('../services/notificacionesService', async (original) => ({
  ...await original(), contarNoLeidas: () => Promise.resolve({ data: { count: 0 } }),
}))
vi.mock('../services/moderacionService', async (original) => ({
  ...await original(), listarPropuestas: vi.fn(), aprobarPropuesta: vi.fn(), rechazarPropuesta: vi.fn(),
}))
vi.mock('../services/reportesService', () => ({
  crearReporte: vi.fn(),
  listarReportes: vi.fn(),
  resolverReporte: vi.fn(),
}))

const paginaVacia = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true }

function Entrar({ role }) {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  return <button onClick={() => {
    setSession({ token: 'jwt-prueba', user: { id: 9, role } })
    navigate('/moderacion')
  }}>Entrar</button>
}

function abrir(role) {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Entrar role={role} />
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  moderacion.listarPropuestas.mockResolvedValue({ data: paginaVacia })
  reportes.listarReportes.mockResolvedValue({ data: paginaVacia })
})
afterEach(cleanup)

describe('Moderación 085: control de acceso en la ruta existente', () => {
  it.each(['MODERADOR', 'ADMINISTRADOR'])('permite el acceso a %s sin duplicar navegación', (role) => {
    abrir(role)
    expect(screen.getByRole('heading', { name: 'Moderación · Eventos y reportes' })).toBeTruthy()
    expect(document.querySelectorAll('.private-shell > header')).toHaveLength(1)
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Eventos pendientes' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Reportes' })).toBeTruthy()
  })

  it('bloquea a USUARIO aunque escriba la URL y no consulta la API', () => {
    abrir('USUARIO')
    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Moderación · Eventos y reportes' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Moderación' })).toBeNull()
    expect(moderacion.listarPropuestas).not.toHaveBeenCalled()
    expect(reportes.listarReportes).not.toHaveBeenCalled()
  })

  it('usa una clase de layout propia y adaptativa para moderación', () => {
    abrir('MODERADOR')
    const shell = document.querySelector('.private-shell')
    expect(shell.className).toContain('private-shell--moderacion')
    expect(shell.className).not.toContain('min-w-[1100px]')
    expect(document.getElementById('private-content').className).toContain('bg-[#111713]')
  })
})
