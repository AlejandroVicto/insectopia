// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { consultarSugeridos, seguirUsuario } from '../../services/perfilService'
import { consultarEventos } from '../../services/eventosService'
import { SuggestedUsers, UpcomingEvents } from './InicioAside'

vi.mock('../../services/perfilService', () => ({ consultarSugeridos: vi.fn(), seguirUsuario: vi.fn() }))
vi.mock('../../services/eventosService', () => ({ consultarEventos: vi.fn() }))
const persona = (id) => ({ id, nombre: `Persona ${id}`, nombreUsuario: `persona${id}`, avatarUrl: null })
const pagina = (content) => ({ content, size: 5, number: 0, totalPages: 1, totalElements: content.length, first: true, last: true })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('columna derecha real de Inicio', () => {
  it('muestra hasta cinco perfiles sin el propio ni repetidos; seguir sustituye sin duplicar peticiones', async () => {
    consultarSugeridos.mockResolvedValueOnce({ data: [persona(7), persona(8), persona(8), ...[9, 10, 11, 12].map(persona)] })
      .mockResolvedValueOnce({ data: [persona(13)] })
    let resolver
    seguirUsuario.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
    render(<MemoryRouter><Routes><Route path="/" element={<SuggestedUsers userId={7} />} /><Route path="/app/usuarios/:id" element={<p>Perfil abierto</p>} /></Routes></MemoryRouter>)
    await screen.findByText('Persona 8')
    const sugerencias = screen.getByRole('heading', { name: 'PERSONAS SUGERIDAS' }).closest('section')
    expect(within(sugerencias).getAllByRole('listitem')).toHaveLength(5)
    expect(within(sugerencias).queryByText('Persona 7')).toBeNull()
    fireEvent.click(within(sugerencias).getByRole('button', { name: 'Seguir a Persona 8' }))
    fireEvent.click(within(sugerencias).getByRole('button', { name: 'Seguir a Persona 8' }))
    expect(seguirUsuario).toHaveBeenCalledTimes(1)
    resolver({ status: 201 })
    await screen.findByText('Persona 13')
    expect(within(sugerencias).getAllByRole('listitem')).toHaveLength(5)
    expect(within(sugerencias).queryByText('Persona 8')).toBeNull()
    expect(consultarSugeridos.mock.calls[1][0].excluir.map(String)).toContain('8')
    fireEvent.click(within(sugerencias).getByRole('link', { name: 'Ver perfil de Persona 9' }))
    expect(screen.getByText('Perfil abierto')).toBeTruthy()
  })

  it('conserva la persona y permite reintentar si falla seguir', async () => {
    consultarSugeridos.mockResolvedValue({ data: [persona(8)] })
    seguirUsuario.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ status: 201 })
    render(<MemoryRouter><SuggestedUsers userId={7} /></MemoryRouter>)
    await screen.findByText('Persona 8')
    fireEvent.click(screen.getByRole('button', { name: 'Seguir a Persona 8' }))
    await screen.findByRole('alert')
    expect(screen.getByText('Persona 8')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir a Persona 8' }))
    await waitFor(() => expect(screen.queryByText('Persona 8')).toBeNull())
  })

  it('consulta eventos aprobados futuros y muestra título y fecha real, sin mapa', async () => {
    consultarEventos.mockResolvedValue({ data: pagina([{ idEvento: 40, titulo: 'Bioblitz real', fechaInicio: '2099-01-05T09:00:00', estado: 'APROBADO' }]) })
    render(<MemoryRouter><UpcomingEvents /></MemoryRouter>)
    expect((await screen.findByRole('link', { name: /Bioblitz real/i })).textContent).toMatch(/5 ene 2099/i)
    expect(consultarEventos).toHaveBeenCalledWith(expect.objectContaining({ size: 5, filtros: { estado: 'APROBADO', periodo: 'futuros' } }))
    expect(screen.getByRole('link', { name: /Bioblitz real/i }).getAttribute('href')).toBe('/app/eventos?evento=40')
    expect(screen.queryByText(/Mapa de eventos/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Ver todos' }).getAttribute('href')).toBe('/app/eventos')
  })

  it('presenta vacío y error con reintento, sin datos ficticios', async () => {
    consultarEventos.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: pagina([]) })
    consultarSugeridos.mockResolvedValue({ data: [] })
    render(<MemoryRouter><SuggestedUsers userId={7} /><UpcomingEvents /></MemoryRouter>)
    await screen.findByText('No hay personas sugeridas disponibles')
    fireEvent.click((await screen.findByRole('alert')).querySelector('button'))
    await screen.findByText('No hay eventos próximos disponibles')
  })
})
