// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { buscarEventosPorTitulo } from '../services/eventosService'
import { buscarUsuarios } from '../services/perfilService'
import Navbar from './Navbar'

vi.mock('../services/perfilService', () => ({ buscarUsuarios: vi.fn() }))
vi.mock('../services/eventosService', () => ({ buscarEventosPorTitulo: vi.fn() }))
vi.mock('../context/useCrearPublicacion', () => ({ useCrearPublicacion: () => ({ abrir: vi.fn() }) }))
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ user: { id: 7, name: 'Yo', email: 'yo@test.local' } }) }))

const paginaEventos = (content) => ({
  content, number: 0, size: 5, totalElements: content.length,
  totalPages: content.length ? 1 : 0, first: true, last: true,
})
const evento = { idEvento: 40, titulo: 'Bioblitz de Elena', fechaInicio: '2099-05-05T20:00:00', estado: 'APROBADO' }

afterEach(() => { cleanup(); vi.resetAllMocks() })

function montarConNavbar(ruta = '/app/mensajes') {
  return render(<MemoryRouter initialEntries={[ruta]}><Navbar />
    <Routes>
      <Route path="/app/mensajes" element={<p>Mensajes</p>} />
      <Route path="/app/eventos" element={<p>Eventos</p>} />
      <Route path="/app/perfil" element={<p>Mi perfil</p>} />
      <Route path="/app/usuarios/:id" element={<p>Perfil público</p>} />
    </Routes>
  </MemoryRouter>)
}

describe('búsqueda global de la navbar', () => {
  it('está habilitada fuera de Inicio y abre perfiles de usuario y fichas de evento', async () => {
    buscarUsuarios.mockResolvedValue({ data: [{ id: 9, nombre: 'Elena', nombreUsuario: 'elena', avatarUrl: null }] })
    buscarEventosPorTitulo.mockResolvedValue({ data: paginaEventos([evento]) })
    montarConNavbar('/app/mensajes')
    const buscar = screen.getByRole('searchbox', { name: 'Buscar usuarios o títulos de eventos' })
    expect(buscar.disabled).toBe(false)
    fireEvent.change(buscar, { target: { value: 'elena' } })
    const usuario = await screen.findByRole('link', { name: 'Ver perfil de Elena' })
    expect(screen.getByRole('link', { name: 'Ver evento Bioblitz de Elena' })).toBeTruthy()
    expect(buscarUsuarios).toHaveBeenCalledWith(expect.objectContaining({ q: 'elena', limite: 5 }))
    expect(buscarEventosPorTitulo).toHaveBeenCalledWith(expect.objectContaining({ q: 'elena', limite: 5 }))
    fireEvent.click(usuario)
    expect(screen.getByText('Perfil público')).toBeTruthy()
  })

  it('abre el evento desde la navbar en el flujo existente de Eventos', async () => {
    buscarUsuarios.mockResolvedValue({ data: [] })
    buscarEventosPorTitulo.mockResolvedValue({ data: paginaEventos([evento]) })
    montarConNavbar('/app/notificaciones')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar usuarios o títulos de eventos' }), { target: { value: 'bio' } })
    fireEvent.click(await screen.findByRole('link', { name: 'Ver evento Bioblitz de Elena' }))
    expect(screen.getByText('Eventos')).toBeTruthy()
  })

  it('muestra vacío o error sin romper la vista cuando falla alguna API', async () => {
    buscarUsuarios.mockRejectedValue(new Error('red'))
    buscarEventosPorTitulo.mockResolvedValue({ data: paginaEventos([]) })
    montarConNavbar('/app/perfil')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar usuarios o títulos de eventos' }), { target: { value: 'nada' } })
    expect(await screen.findByText('Sin resultados para “nada”.')).toBeTruthy()
    expect(screen.getByText('Mi perfil')).toBeTruthy()
  })
})
