import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { adaptarPerfil } from '../adapters/perfilAdapter'
import { adaptarPaginaPublicaciones } from '../adapters/publicacionesAdapter'
import { adaptarPagina, adaptarSeguido } from '../adapters/mensajesAdapter'
import {
  consultarMiPerfil,
  consultarMisPublicaciones,
  consultarIdentidad,
  consultarSeguidos,
} from '../services/perfilService'
import { quitarReaccion, reaccionar } from '../services/reaccionesService'
import { mensajeErrorApi } from '../services/erroresApi'
import { obtenerPaises } from '../services/catalogoService'
import PublicationCard from '../components/inicio/PublicationCard'
import FeedPagination from '../components/inicio/FeedPagination'
import { FeedEmpty, FeedError, FeedLoading } from '../components/inicio/FeedStates'
import EditarPublicacionModal from '../components/modales/EditarPublicacionModal'
import EliminarPublicacionModal from '../components/modales/EliminarPublicacionModal'
import PerfilUsuariosModal from '../components/perfil/PerfilUsuariosModal'
import PerfilResumen from '../components/perfil/PerfilResumen'
import './inicio.css'
import './mi-perfil.css'

const TAMANO_PAGINA = 10

function fechaRegistro(value) {
  if (!value || Number.isNaN(Date.parse(value))) return null
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(value))
}

export default function MiPerfil() {
  const { token, user } = useAuth()
  const [retry, setRetry] = useState(0)
  const [postsRetry, setPostsRetry] = useState(0)
  const [page, setPage] = useState(0)
  const [identity, setIdentity] = useState(null)
  const [countResult, setCountResult] = useState(null)
  const [posts, setPosts] = useState(null)
  const [country, setCountry] = useState(null)
  const [modal, setModal] = useState(null)
  const [seleccionada, setSeleccionada] = useState(null)
  const [comentariosId, setComentariosId] = useState(null)
  const [reaccionando, setReaccionando] = useState(null)
  const [accionError, setAccionError] = useState('')
  const updateTotal = useCallback((total) => setCountResult({ status: 'success', total }), [])
  const profile = identity?.status === 'success' ? identity.profile : null
  const postsKey = JSON.stringify([token, page, postsRetry])
  const visiblePosts = posts?.key === postsKey ? posts : { status: 'loading', data: null }

  useEffect(() => {
    const controller = new AbortController()
    // El perfil completo es la fuente preferida; auth/me solo da identidad pública parcial.
    consultarMiPerfil({ signal: controller.signal }).then(({ data }) => {
      const parsed = adaptarPerfil(data)
      if (!controller.signal.aborted) setIdentity({ status: 'success', profile: parsed, partial: false })
    }).catch(async (error) => {
      if (controller.signal.aborted) return
      if (error.response?.status !== 404) { setIdentity({ status: 'error' }); return }
      try {
        const { data } = await consultarIdentidad({ signal: controller.signal })
        const parsed = adaptarPerfil(data)
        if (!controller.signal.aborted) setIdentity({ status: 'success', profile: parsed, partial: true })
      } catch { if (!controller.signal.aborted) setIdentity({ status: 'error' }) }
    })
    consultarSeguidos({ size: 1, signal: controller.signal }).then(({ data }) => {
      const pagina = adaptarPagina(data, adaptarSeguido)
      if (!controller.signal.aborted) setCountResult({ status: 'success', total: pagina.totalElements })
    }).catch(() => { if (!controller.signal.aborted) setCountResult({ status: 'error' }) })
    return () => controller.abort()
  }, [token, retry])

  useEffect(() => {
    const controller = new AbortController()
    consultarMisPublicaciones({ page, size: TAMANO_PAGINA, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        const pagina = adaptarPaginaPublicaciones(data)
        // Si una eliminación dejó la página actual fuera de rango, pedir la última válida.
        if ((pagina.totalPages > 0 && page >= pagina.totalPages)
            || (pagina.totalPages === 0 && page !== 0)) {
          setPage(Math.max(pagina.totalPages - 1, 0))
          return
        }
        setPosts({ key: postsKey, status: 'success', data: pagina })
      })
      .catch(() => {
        if (!controller.signal.aborted) setPosts({ key: postsKey, status: 'error', data: null })
      })
    return () => controller.abort()
  }, [token, page, postsRetry, postsKey])

  useEffect(() => {
    if (!profile?.paisCodigo) return undefined
    let active = true
    obtenerPaises().then((list) => {
      if (active) setCountry(Array.isArray(list) ? list.find((item) => item.codigo === profile.paisCodigo)?.nombre ?? null : null)
    }).catch(() => { if (active) setCountry(null) })
    return () => { active = false }
  }, [profile?.paisCodigo])

  const seguidos = countResult?.status === 'success' ? countResult.total : profile?.seguidos
  const location = profile && [profile.estadoRegion, country ?? profile.paisCodigo].filter(Boolean).join(', ')
  const usuarioFeed = user?.id != null ? user : { ...user, id: profile?.id }

  function puedeGestionar(publicacion) {
    return (usuarioFeed?.id != null && String(usuarioFeed.id) === String(publicacion?.autor?.id))
      || user?.role === 'ADMINISTRADOR'
  }

  function recargarPerfil() {
    setRetry((valor) => valor + 1)
  }

  function recargarPublicaciones() {
    setPostsRetry((valor) => valor + 1)
  }

  function abrirModal(tipo, publicacion = null) {
    if ((tipo === 'editar' || tipo === 'eliminar') && !puedeGestionar(publicacion)) return
    setAccionError('')
    setSeleccionada(publicacion)
    setModal(tipo)
  }

  function cerrarModal() {
    setModal(null)
    setSeleccionada(null)
  }

  async function alternarReaccion(post) {
    if (reaccionando === post.id) return
    setAccionError('')
    setReaccionando(post.id)
    try {
      if (post.reaccionUsuario) await quitarReaccion(post.id)
      else await reaccionar(post.id)
      recargarPublicaciones()
    } catch (fallo) {
      setAccionError(mensajeErrorApi(fallo, 'No se pudo actualizar la reacción.'))
    } finally {
      setReaccionando(null)
    }
  }

  function alternarComentarios(post) {
    setAccionError('')
    setComentariosId((actual) => actual === post.id ? null : post.id)
  }

  function comentarioCreado() {
    recargarPublicaciones()
  }

  function publicacionEliminada() {
    recargarPublicaciones()
    recargarPerfil()
  }

  return <div className="inicio perfil h-full min-h-0 overflow-hidden p-4 text-[var(--inicio-text)]" key={token}>
    <h1 className="sr-only">Mi perfil</h1>
    <div className="perfil-grid mx-auto h-full min-h-0 max-w-[1500px]">
      <div id="perfil-feed" className="inicio-scroll min-h-0 min-w-0 space-y-5 overflow-y-auto overscroll-contain"
        role="region" aria-label="Contenido de mi perfil" tabIndex={0}>
        {identity?.status === 'error' && <div className="inicio-card perfil-state" role="alert"><strong>No pudimos cargar tu perfil</strong>
          <p>Tu información no está disponible. Comprueba la conexión e inténtalo de nuevo.</p>
          <button type="button" className="perfil-secondary mt-4" onClick={() => { setIdentity(null); setCountResult(null); setRetry((n) => n + 1) }}>Reintentar</button></div>}
        {!identity && <div className="inicio-card perfil-state" role="status">Cargando tu perfil...</div>}
        {identity?.partial && <p role="status" className="perfil-note">Perfil completo pendiente de GET /api/usuarios/me. Solo se muestra la identidad confirmada por /api/auth/me; biografía, ubicación y estadísticas no están disponibles.</p>}
         {profile && <PerfilResumen profile={profile} location={location} parcial={identity.partial}
           action={<Link to="/app/configuracion?seccion=perfil" className="perfil-primary text-center">Editar perfil</Link>} />}
        <section aria-labelledby="perfil-posts-title" className="min-w-0">
          <h2 id="perfil-posts-title" className="mb-4 px-3 text-base font-bold">Mis Publicaciones</h2>
          {accionError && <div role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-200">{accionError}</div>}
          {visiblePosts.status === 'loading' && <FeedLoading />}
          {visiblePosts.status === 'error' && <FeedError
            titulo="No pudimos cargar tus publicaciones"
            onRetry={recargarPublicaciones} />}
          {visiblePosts.status === 'success' && <>
            {visiblePosts.data.content.length === 0
              ? <FeedEmpty titulo="Aún no has publicado" mensaje="Cuando compartas tu primer avistamiento aparecerá aquí." />
              : <div className="grid gap-4">{visiblePosts.data.content.map((post) => <PublicationCard key={post.id} post={post}
                user={usuarioFeed}
                onReaccion={alternarReaccion} reaccionando={reaccionando === post.id}
                onComentar={alternarComentarios} comentariosAbiertos={comentariosId === post.id}
                onCerrarComentarios={() => setComentariosId(null)} onComentarioCreado={comentarioCreado}
                onEditar={(seleccion) => abrirModal('editar', seleccion)}
                onEliminar={(seleccion) => abrirModal('eliminar', seleccion)} />)}</div>}
            <FeedPagination label="Páginas de mis publicaciones" page={visiblePosts.data.number}
              totalPages={visiblePosts.data.totalPages} first={visiblePosts.data.first}
              last={visiblePosts.data.last} onChange={setPage} />
          </>}
        </section>
      </div>
      <aside aria-label="Estadísticas de mi perfil" className="perfil-aside">
        <div className="inicio-card p-4">
          <p className="break-words text-sm font-bold">{profile ? `@${profile.nombreUsuario}` : 'Mi comunidad'}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className="perfil-stat" onClick={(event) => { event.currentTarget.focus(); setModal('seguidores') }} aria-haspopup="dialog" aria-label={`${profile?.seguidores ?? 'No disponible'} Seguidores`}><strong>{profile?.seguidores ?? '—'}</strong><span>Seguidores</span></button>
            <button type="button" className="perfil-stat" onClick={(event) => { event.currentTarget.focus(); setModal('seguidos') }} aria-haspopup="dialog" aria-label={`${seguidos ?? 'No disponible'} Seguidos`}><strong>{seguidos ?? '—'}</strong><span>Seguidos</span></button>
          </div>
          {countResult?.status === 'error' && <p role="status" className="mt-2 text-xs text-[var(--inicio-muted)]">Conteo de seguidos no disponible.</p>}
          <div className="perfil-stat mt-4"><strong>{profile?.publicaciones ?? '—'}</strong><span>Publicaciones</span></div>
          <div className="perfil-stat mt-2"><strong>{fechaRegistro(profile?.fechaRegistro) ?? '—'}</strong><span>Miembro desde</span></div>
          <p className="mt-4 text-xs text-[var(--inicio-muted)]">— indica información aún no disponible.</p>
        </div>
      </aside>
    </div>
    {modal === 'seguidores' && <PerfilUsuariosModal tipo="seguidores" ownId={profile?.id ?? user?.id} onClose={() => setModal(null)} onChanged={recargarPerfil} />}
    {modal === 'seguidos' && <PerfilUsuariosModal tipo="seguidos" ownId={profile?.id ?? user?.id} onClose={() => setModal(null)} onTotal={updateTotal} onChanged={recargarPerfil} />}
    {modal === 'editar' && <EditarPublicacionModal open publicacion={seleccionada}
      puedeEditar={puedeGestionar(seleccionada)} onClose={cerrarModal} onSuccess={recargarPublicaciones} />}
    {modal === 'eliminar' && <EliminarPublicacionModal open publicacion={seleccionada}
      onClose={cerrarModal} onSuccess={publicacionEliminada} />}
  </div>
}
