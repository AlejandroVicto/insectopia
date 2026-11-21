import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { adaptarPublicacion } from '../adapters/publicacionesAdapter'
import PublicationCard from '../components/inicio/PublicationCard'
import EditarPublicacionModal from '../components/modales/EditarPublicacionModal'
import EliminarPublicacionModal from '../components/modales/EliminarPublicacionModal'
import ReportarPublicacionModal from '../components/modales/ReportarPublicacionModal'
import { consultarPublicacion } from '../services/publicacionesService'
import { quitarReaccion, reaccionar } from '../services/reaccionesService'
import { mensajeErrorApi } from '../services/erroresApi'
import './inicio.css'

export default function PublicacionDetalle() {
  const { id: rawId } = useParams()
  const { user } = useAuth()
  const id = /^[1-9]\d*$/.test(rawId ?? '') ? Number(rawId) : null
  const validId = Number.isSafeInteger(id) && id > 0
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const [commentsClosedFor, setCommentsClosedFor] = useState(null)
  const [reactionPending, setReactionPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [modal, setModal] = useState(null)
  const reacting = useRef(false)
  const key = `${user?.id}:${id}:${retry}`
  const visible = !validId ? { status: 'unavailable' }
    : result?.key === key ? result : { status: 'loading' }
  const post = visible.status === 'success' ? visible.post : null

  useEffect(() => {
    if (!validId) return undefined
    const controller = new AbortController()
    consultarPublicacion(id, { signal: controller.signal }).then(({ data }) => {
      const adapted = adaptarPublicacion(data)
      if (String(adapted.id) !== String(id) || adapted.estado === 'ELIMINADA') {
        throw new Error('La publicación solicitada no está disponible')
      }
      if (!controller.signal.aborted) setResult({ key, status: 'success', post: adapted })
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ key, status: [403, 404].includes(error.response?.status) ? 'unavailable' : 'error' })
    })
    return () => controller.abort()
  }, [id, key, validId])

  async function toggleReaction(selected) {
    if (reacting.current) return
    reacting.current = true
    setReactionPending(true)
    setActionError('')
    try {
      const { data } = selected.reaccionUsuario ? await quitarReaccion(id) : await reaccionar(id)
      setResult((previous) => previous?.key === key && previous.status === 'success'
        ? { ...previous, post: { ...previous.post, reaccionUsuario: data?.tipo ?? null,
          totalReacciones: Number.isSafeInteger(data?.total) ? data.total : previous.post.totalReacciones } } : previous)
    } catch (error) {
      setActionError(mensajeErrorApi(error, 'No se pudo actualizar la reacción.'))
    } finally {
      reacting.current = false
      setReactionPending(false)
    }
  }

  function comentarioCreado() {
    setResult((previous) => previous?.key === key && previous.status === 'success'
      ? { ...previous, post: { ...previous.post,
        totalComentarios: (previous.post.totalComentarios ?? 0) + 1 } } : previous)
  }

  const canEdit = post && (String(post.autor.id) === String(user?.id) || user?.role === 'ADMINISTRADOR')

  return <section className="inicio h-full min-h-0 overflow-y-auto px-4 py-5 text-[var(--inicio-text)]"
    aria-label="Detalle de publicación">
    <div className="mx-auto max-w-[866px] space-y-4">
      <Link to="/app/notificaciones" className="inline-block text-xs font-bold text-[var(--inicio-lime)] underline underline-offset-4">
        ← Volver a Notificaciones
      </Link>
      <h1 className="font-display text-xl font-bold">Publicación</h1>
      {visible.status === 'loading' && <p role="status" className="inicio-card p-6 text-sm">Cargando publicación…</p>}
      {visible.status === 'unavailable' && <div role="alert" className="inicio-card p-6">
        <h2 className="font-display font-bold">Contenido no disponible</h2>
        <p className="mt-2 text-xs text-[var(--inicio-muted)]">La publicación ya no existe o no puedes consultarla.</p>
      </div>}
      {visible.status === 'error' && <div role="alert" className="inicio-card p-6">
        <h2 className="font-display font-bold">No pudimos cargar la publicación</h2>
        <p className="mt-2 text-xs text-[var(--inicio-muted)]">Comprueba tu conexión y vuelve a intentarlo.</p>
        <button type="button" className="inicio-primary mt-3 px-4 py-2 text-xs" onClick={() => setRetry((n) => n + 1)}>Reintentar</button>
      </div>}
      {post && <>
        {actionError && <p role="alert" className="inicio-card p-3 text-xs text-red-200">{actionError}</p>}
        <PublicationCard key={id} post={post} user={user} onReaccion={toggleReaction} reaccionando={reactionPending}
          onComentar={() => setCommentsClosedFor((current) => current === id ? null : id)}
          comentariosAbiertos={commentsClosedFor !== id} onCerrarComentarios={() => setCommentsClosedFor(id)}
          onComentarioCreado={comentarioCreado} onEditar={() => setModal('editar')}
          onEliminar={() => setModal('eliminar')} onReportar={() => setModal('reportar')} />
      </>}
    </div>
    {post && modal === 'editar' && <EditarPublicacionModal open publicacion={post} puedeEditar={canEdit}
      onClose={() => setModal(null)} onSuccess={() => setRetry((n) => n + 1)} />}
    {post && modal === 'eliminar' && <EliminarPublicacionModal open publicacion={post}
      onClose={() => setModal(null)} onSuccess={() => setRetry((n) => n + 1)} />}
    {post && modal === 'reportar' && <ReportarPublicacionModal open publicacion={post}
      onClose={() => setModal(null)} onSuccess={() => setRetry((n) => n + 1)} />}
  </section>
}
