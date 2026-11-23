import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import UserAccount from './UserAccount'
import { useCrearPublicacion } from '../context/useCrearPublicacion'
import { adaptarPaginaEventos } from '../adapters/eventosAdapter'
import { buscarEventosPorTitulo } from '../services/eventosService'
import { buscarUsuarios } from '../services/perfilService'

const RESULTADO_VACIO = { q: '', estado: 'idle', usuarios: [], eventos: [] }

function estadoInicial(ruta) {
  return { ruta, termino: '', resultados: RESULTADO_VACIO, panelAbierto: false, activo: -1 }
}

function validarUsuario(usuario) {
  return usuario && usuario.id != null && usuario.nombre && usuario.nombreUsuario
}

export default function Navbar({ notificationCount, inactive = false, onLogout }) {
  const hasCount = Number.isInteger(notificationCount) && notificationCount > 0
  const { abrir: abrirCrear } = useCrearPublicacion()
  const navigate = useNavigate()
  const pathname = useLocation().pathname
  const [busqueda, setBusqueda] = useState(() => estadoInicial(pathname))
  const contenedor = useRef(null)
  const peticion = useRef(0)

  // Ajustar el estado durante el render evita una cascada de efectos al cambiar de sección.
  if (busqueda.ruta !== pathname) setBusqueda(estadoInicial(pathname))
  const vigente = busqueda.ruta === pathname ? busqueda : estadoInicial(pathname)
  const { termino, panelAbierto, activo } = vigente
  const q = termino.trim()
  const visibles = vigente.resultados.q === q
    ? vigente.resultados
    : { q, estado: q ? 'cargando' : 'idle', usuarios: [], eventos: [] }
  const abierto = panelAbierto && Boolean(q)
  const opciones = [
    ...visibles.usuarios.map((usuario) => ({
      id: `usuario-${usuario.id}`,
      tipo: 'Usuario',
      etiqueta: `${usuario.nombre} (@${usuario.nombreUsuario})`,
      destino: `/app/usuarios/${encodeURIComponent(usuario.id)}`,
      ariaLabel: `Ver perfil de ${usuario.nombre}`,
    })),
    ...visibles.eventos.map((evento) => ({
      id: `evento-${evento.id}`,
      tipo: 'Evento',
      etiqueta: evento.titulo,
      destino: `/app/eventos?evento=${encodeURIComponent(evento.id)}`,
      ariaLabel: `Ver evento ${evento.titulo}`,
    })),
  ]

  function actualizar(cambios) {
    setBusqueda((previo) => ({
      ...(previo.ruta === pathname ? previo : estadoInicial(pathname)),
      ...cambios,
      ruta: pathname,
    }))
  }

  useEffect(() => {
    function alHacerClic(evento) {
      if (!contenedor.current?.contains(evento.target)) {
        setBusqueda((previo) => ({ ...previo, panelAbierto: false }))
      }
    }
    document.addEventListener('mousedown', alHacerClic)
    return () => document.removeEventListener('mousedown', alHacerClic)
  }, [])

  useEffect(() => {
    if (!q) return undefined
    peticion.current += 1
    const solicitud = peticion.current
    const controlador = new AbortController()

    const temporizador = setTimeout(() => {
      Promise.allSettled([
        buscarUsuarios({ q, limite: 5, signal: controlador.signal }),
        buscarEventosPorTitulo({ q, limite: 5, signal: controlador.signal }),
      ]).then(([respuestaUsuarios, respuestaEventos]) => {
        if (controlador.signal.aborted || peticion.current !== solicitud) return
        const usuarios = respuestaUsuarios.status === 'fulfilled' && Array.isArray(respuestaUsuarios.value.data)
          ? respuestaUsuarios.value.data.filter(validarUsuario).slice(0, 5) : []
        const eventos = respuestaEventos.status === 'fulfilled'
          ? adaptarPaginaEventos(respuestaEventos.value.data).content
            .filter((evento) => evento.titulo?.toLocaleLowerCase('es-MX').includes(q.toLocaleLowerCase('es-MX')))
            .slice(0, 5)
          : []
        const fallos = Number(respuestaUsuarios.status === 'rejected') + Number(respuestaEventos.status === 'rejected')
        setBusqueda((previo) => ({
          ...previo,
          resultados: { q, estado: fallos === 2 ? 'error' : 'listo', usuarios, eventos },
        }))
      })
    }, 300)

    return () => { clearTimeout(temporizador); controlador.abort() }
  }, [q])

  function alEscribir(evento) {
    const valor = evento.target.value
    actualizar({ termino: valor, panelAbierto: Boolean(valor.trim()), activo: -1 })
  }

  function alPresionarTecla(evento) {
    if (evento.key === 'Escape') {
      actualizar({ panelAbierto: false })
      return
    }
    if (!opciones.length) return
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      actualizar({ panelAbierto: true, activo: (activo + 1) % opciones.length })
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      actualizar({ panelAbierto: true, activo: activo <= 0 ? opciones.length - 1 : activo - 1 })
    } else if (evento.key === 'Enter' && abierto && activo >= 0) {
      evento.preventDefault()
      navigate(opciones[activo].destino)
      actualizar({ panelAbierto: false })
    }
  }

  function cerrar() {
    actualizar({ termino: '', panelAbierto: false, activo: -1 })
  }

  return (
    <header inert={inactive ? true : undefined} className="grid h-20 grid-cols-[minmax(0,1fr)_minmax(200px,570px)_minmax(0,1fr)] items-center bg-[var(--nav-header)] px-6">
      <Link to="/app" className="flex h-14 w-56 shrink-0 items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)]" aria-label="Ir al inicio de Insectopia">
        <img src={logo} alt="Logo de Insectopia" className="size-10 shrink-0 object-contain" />
        <span className="font-display text-lg font-bold text-[var(--nav-light)]">Insectopia</span>
      </Link>
      <div ref={contenedor} className="relative min-w-0 w-full">
        <label htmlFor="nav-search" className="sr-only">Buscar usuarios o títulos de eventos</label>
        <span aria-hidden="true" className="pointer-events-none absolute left-4 top-2 text-lg text-[var(--nav-muted)]">⌕</span>
        <input id="nav-search" type="search" value={termino} onChange={alEscribir} onKeyDown={alPresionarTecla}
          onFocus={() => { if (q) actualizar({ panelAbierto: true }) }} aria-expanded={abierto} aria-controls="nav-search-resultados"
          placeholder="Buscar usuarios o eventos…"
          className="h-10 w-full rounded-full bg-[var(--nav-sidebar)] pl-10 pr-4 text-xs text-[var(--nav-light)] placeholder:text-[var(--nav-muted)] focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)]" />
        {abierto && q && <div id="nav-search-resultados" className="nav-search-panel" role="region" aria-label="Resultados de búsqueda">
          {visibles.estado === 'cargando' && <p role="status" className="nav-search-mensaje">Buscando…</p>}
          {visibles.estado === 'error' && <p role="alert" className="nav-search-mensaje">No se pudo completar la búsqueda. Reintenta.</p>}
          {visibles.estado === 'listo' && !opciones.length && <p role="status" className="nav-search-mensaje">Sin resultados para “{q}”.</p>}
          {visibles.estado === 'listo' && opciones.length > 0 && ['Usuario', 'Evento'].map((tipo) => {
            const delTipo = opciones.filter((opcion) => opcion.tipo === tipo)
            if (!delTipo.length) return null
            return <div key={tipo}>
              <h2 className="nav-search-titulo">{tipo === 'Usuario' ? 'USUARIOS' : 'EVENTOS'}</h2>
              <ul>
                {delTipo.map((opcion) => {
                  const indice = opciones.indexOf(opcion)
                  return <li key={opcion.id}>
                    <Link id={`nav-opcion-${indice}`} to={opcion.destino} onClick={cerrar}
                      onMouseEnter={() => actualizar({ activo: indice })}
                      aria-label={opcion.ariaLabel}
                      aria-current={activo === indice ? 'true' : undefined}
                      className={`nav-search-opcion${activo === indice ? ' nav-search-opcion--activa' : ''}`}>
                      <span className="nav-search-tipo">{tipo}</span>
                      <span className="truncate">{opcion.etiqueta}</span>
                    </Link>
                  </li>
                })}
              </ul>
            </div>
          })}
        </div>}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-3">
        <button type="button" onClick={abrirCrear} aria-haspopup="dialog" title="Registrar observación" className="h-10 w-36 rounded-full bg-[var(--nav-lime)] text-xs font-semibold text-[var(--nav-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nav-lime)]">+ Crear publicación</button>
        <Link to="/app/notificaciones" aria-label={hasCount ? `Notificaciones: ${notificationCount}` : 'Notificaciones'} className="relative flex size-10 items-center justify-center rounded-full text-[var(--nav-muted)] hover:bg-[var(--nav-active)] focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)]">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5"><path d="M12 2a2 2 0 0 0-2 2v.2A7 7 0 0 0 5 11v4l-1.5 2.5A1 1 0 0 0 4.4 19h15.2a1 1 0 0 0 .9-1.5L19 15v-4a7 7 0 0 0-5-6.8V4a2 2 0 0 0-2-2Zm-2 19a2 2 0 0 4 0h-4Z" /></svg>
          {hasCount && <span className="absolute -right-1 -top-1 rounded-full bg-[var(--nav-lime)] px-1.5 text-[10px] font-bold text-[var(--nav-ink)]">{notificationCount}</span>}
        </Link>
        <UserAccount onLogout={onLogout} />
      </div>
    </header>
  )
}
