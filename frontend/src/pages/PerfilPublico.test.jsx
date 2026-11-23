// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { consultarPerfilPublico, consultarPublicacionesPublicas, seguirUsuario } from '../services/perfilService'
import PerfilPublico from './PerfilPublico'

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ user: { id: 7, role: 'ADMINISTRADOR' } }) }))
vi.mock('../services/perfilService', () => ({ consultarPerfilPublico: vi.fn(), consultarPublicacionesPublicas: vi.fn(), seguirUsuario: vi.fn(), dejarSeguirUsuario: vi.fn() }))
const pagina = (content) => ({ content, number: 0, size: 10, totalPages: content.length ? 1 : 0, totalElements: content.length, first: true, last: true })
const perfil = { id: 9, nombre: 'Elena', nombreUsuario: 'elena', avatarUrl: null, descripcion: 'Observadora', loSigo: false, totalSeguidores: 2, totalSeguidos: 3, correo: 'privado@test.local', telefono: '555000' }
const post = { id: 15, autor: { id: 9, nombre: 'Elena', nombreUsuario: 'elena' }, contenido: 'Mariposa visible', estado: 'VISIBLE' }
afterEach(() => { cleanup(); vi.resetAllMocks() })
function montar(path = '/app/usuarios/9') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/app/usuarios/:id" element={<PerfilPublico />} />
    <Route path="/app/perfil" element={<p>Mi perfil</p>} />
    <Route path="/app" element={<p>Inicio</p>} />
  </Routes></MemoryRouter>)
}
describe('perfil público directo', () => {
  it('solo muestra datos públicos y publicaciones visibles, sin editar ni borrar incluso siendo administrador', async () => {
    consultarPerfilPublico.mockResolvedValue({ data: perfil })
    consultarPublicacionesPublicas.mockResolvedValue({ data: pagina([post]) })
    seguirUsuario.mockResolvedValue({ status: 201 })
    montar()
    expect(await screen.findByText('Mariposa visible')).toBeTruthy()
    expect(screen.getByText('Observadora')).toBeTruthy()
    expect(document.body.textContent).not.toContain('privado@test.local')
    expect(document.body.textContent).not.toContain('555000')
    expect(screen.queryByRole('link', { name: 'Editar perfil' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Más opciones/ })).toBeNull()
    expect(screen.queryByText('Ubicación')).toBeNull()
    expect(consultarPublicacionesPublicas).toHaveBeenCalledWith('9', expect.objectContaining({ page: 0 }))
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Siguiendo' })).toBeTruthy())
    expect(seguirUsuario).toHaveBeenCalledWith('9')
    fireEvent.click(screen.getByRole('link', { name: /volver a inicio/i }))
    expect(screen.getByText('Inicio')).toBeTruthy()
  })
  it('redirige el ID propio sin pedir información pública', () => {
    montar('/app/usuarios/7')
    expect(screen.getByText('Mi perfil')).toBeTruthy()
    expect(consultarPerfilPublico).not.toHaveBeenCalled()
  })
  it('muestra usuario no disponible y perfil sin publicaciones', async () => {
    consultarPerfilPublico.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValue({ data: perfil })
    consultarPublicacionesPublicas.mockResolvedValue({ data: pagina([]) })
    const vista = montar()
    await screen.findByText('Usuario inexistente o cuenta no disponible.')
    vista.unmount()
    montar()
    await screen.findByText('Sin publicaciones visibles')
  })
})
