import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { adaptarPerfil } from '../adapters/perfilAdapter'
import { adaptarPaginaPublicaciones } from '../adapters/publicacionesAdapter'
import { consultarPerfilPublico, consultarPublicacionesPublicas, dejarSeguirUsuario, seguirUsuario } from '../services/perfilService'
import { quitarReaccion, reaccionar } from '../services/reaccionesService'
import { mensajeErrorApi } from '../services/erroresApi'
import PerfilResumen from '../components/perfil/PerfilResumen'
import PublicationCard from '../components/inicio/PublicationCard'
import FeedPagination from '../components/inicio/FeedPagination'
import { FeedEmpty, FeedError, FeedLoading } from '../components/inicio/FeedStates'
import './inicio.css'
import './mi-perfil.css'

function ContenidoPerfil({ id, user }) {
  const [identity, setIdentity] = useState(null)
  const [retry, setRetry] = useState(0)
  const [page, setPage] = useState(0)
  const [postsRetry, setPostsRetry] = useState(0)
  const [posts, setPosts] = useState(null)
  const [pending, setPending] = useState(false)
  const followPending = useRef(false)
  const [followError, setFollowError] = useState('')
  const [comentariosId, setComentariosId] = useState(null)
  const [reaccionando, setReaccionando] = useState(null)
  const [accionError, setAccionError] = useState('')
  const profile = identity?.status === 'success' ? identity.profile : null
  const key = JSON.stringify([id, page, postsRetry])
  const visiblePosts = posts?.key === key ? posts : { status: 'loading' }

  useEffect(() => {
    const controller = new AbortController()
    consultarPerfilPublico(id, { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return
      const perfil = adaptarPerfil({
        id: data?.id, nombre: data?.nombre, nombreUsuario: data?.nombreUsuario,
        avatarUrl: data?.avatarUrl, biografia: data?.descripcion,
        totalSeguidores: data?.totalSeguidores, totalSeguidos: data?.totalSeguidos,
      })
      setIdentity({ status: 'success', profile: perfil, loSigo: data.loSigo === true })
    }).catch((error) => {
      if (!controller.signal.aborted) setIdentity({ status: error.response?.status === 404 ? 'missing' : 'error' })
    })
    return () => controller.abort()
  }, [id, retry])

  useEffect(() => {
    if (!profile) return undefined
    const controller = new AbortController()
    consultarPublicacionesPublicas(id, { page, signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return
      const pagina = adaptarPaginaPublicaciones(data)
      if (page > 0 && page >= pagina.totalPages) { setPage(Math.max(pagina.totalPages - 1, 0)); return }
      setPosts({ key, status: 'success', data: pagina })
    }).catch(() => { if (!controller.signal.aborted) setPosts({ key, status: 'error' }) })
    return () => controller.abort()
  }, [id, profile, page, postsRetry, key])

  async function alternarSeguimiento() {
    if (followPending.current || !profile || String(profile.id) === String(user?.id)) return
    followPending.current = true
    setPending(true)
    setFollowError('')
    try {
      if (identity.loSigo) await dejarSeguirUsuario(id)
      else await seguirUsuario(id)
      setIdentity((actual) => ({ ...actual, loSigo: !actual.loSigo,
        profile: { ...actual.profile, seguidores: Math.max(0, (actual.profile.seguidores ?? 0) + (actual.loSigo ? -1 : 1)) } }))
    } catch (error) { setFollowError(mensajeErrorApi(error, 'No se pudo actualizar el seguimiento.')) }
    finally { followPending.current = false; setPending(false) }
  }

  async function alternarReaccion(post) {
    if (reaccionando === post.id) return
    setReaccionando(post.id)
    setAccionError('')
    try {
      if (post.reaccionUsuario) await quitarReaccion(post.id)
      else await reaccionar(post.id)
      setPostsRetry((n) => n + 1)
    } catch (error) { setAccionError(mensajeErrorApi(error)) }
    finally { setReaccionando(null) }
  }

  return <div className="inicio perfil h-full min-h-0 overflow-hidden p-4 text-[var(--inicio-text)]">
    <h1 className="sr-only">Perfil público</h1>
    <div className="perfil-grid mx-auto h-full min-h-0 max-w-[1500px]">
      <div className="inicio-scroll min-h-0 min-w-0 space-y-5 overflow-y-auto overscroll-contain" role="region" aria-label="Contenido del perfil público" tabIndex={0}>
        <Link to="/app" className="inline-block text-xs font-bold text-[var(--inicio-lime)] hover:underline">← Volver a Inicio</Link>
        {!identity && <div role="status" className="inicio-card perfil-state">Cargando perfil…</div>}
        {identity?.status === 'missing' && <div role="alert" className="inicio-card perfil-state">Usuario inexistente o cuenta no disponible.</div>}
        {identity?.status === 'error' && <div role="alert" className="inicio-card perfil-state">No pudimos cargar este perfil.
          <button type="button" className="perfil-secondary mt-4 block" onClick={() => { setIdentity(null); setRetry((n) => n + 1) }}>Reintentar</button></div>}
        {profile && <>
          <PerfilResumen profile={profile} publico action={<button type="button" className="perfil-primary" disabled={pending}
            onClick={alternarSeguimiento}>{pending ? 'Actualizando…' : identity.loSigo ? 'Siguiendo' : 'Seguir'}</button>} />
          {followError && <p role="alert" className="perfil-note text-red-300">{followError}</p>}
          <section aria-labelledby="perfil-publicaciones" className="min-w-0">
            <h2 id="perfil-publicaciones" className="mb-4 px-3 text-base font-bold">Publicaciones</h2>
            {accionError && <p role="alert" className="perfil-note mb-4 text-red-300">{accionError}</p>}
            {visiblePosts.status === 'loading' && <FeedLoading />}
            {visiblePosts.status === 'error' && <FeedError titulo="No pudimos cargar las publicaciones" onRetry={() => setPostsRetry((n) => n + 1)} />}
            {visiblePosts.status === 'success' && <>
              {visiblePosts.data.content.length === 0
                ? <FeedEmpty titulo="Sin publicaciones visibles" mensaje="Esta persona aún no tiene publicaciones públicas." />
                : <div className="grid gap-4">{visiblePosts.data.content.map((post) => <PublicationCard key={post.id} post={post} user={user}
                  onReaccion={alternarReaccion} reaccionando={reaccionando === post.id}
                  onComentar={() => setComentariosId((actual) => actual === post.id ? null : post.id)}
                  comentariosAbiertos={comentariosId === post.id} onCerrarComentarios={() => setComentariosId(null)}
                  onComentarioCreado={() => setPostsRetry((n) => n + 1)} />)}</div>}
              <FeedPagination page={visiblePosts.data.number} totalPages={visiblePosts.data.totalPages}
                first={visiblePosts.data.first} last={visiblePosts.data.last} onChange={setPage} />
            </>}
          </section>
        </>}
      </div>
      {profile && <aside aria-label="Estadísticas públicas" className="perfil-aside">
        <div className="inicio-card p-4"><p className="break-words text-sm font-bold">@{profile.nombreUsuario}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="perfil-stat"><strong>{profile.seguidores ?? '—'}</strong><span>Seguidores</span></div>
            <div className="perfil-stat"><strong>{profile.seguidos ?? '—'}</strong><span>Seguidos</span></div>
          </div>
          <div className="perfil-stat mt-4"><strong>{visiblePosts.status === 'success' ? visiblePosts.data.totalElements : '—'}</strong><span>Publicaciones visibles</span></div>
        </div>
      </aside>}
    </div>
  </div>
}

export default function PerfilPublico() {
  const { id } = useParams()
  const { user } = useAuth()
  if (/^[1-9]\d*$/.test(id) && Number(id) === Number(user?.id)) return <Navigate to="/app/perfil" replace />
  return <ContenidoPerfil key={id} id={id} user={user} />
}
