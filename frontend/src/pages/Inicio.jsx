import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { adaptarPaginaPublicaciones } from '../adapters/publicacionesAdapter'
import { consultarDemo, eventosDemo, sugerenciasDemo, tendenciasDemo } from '../data/inicioDemo'
import { consultarPublicaciones } from '../services/publicacionesService'
import FeedFilters from '../components/inicio/FeedFilters'
import PostComposer from '../components/inicio/PostComposer'
import PublicationCard from '../components/inicio/PublicationCard'
import FeedPagination from '../components/inicio/FeedPagination'
import { FeedEmpty, FeedError, FeedLoading } from '../components/inicio/FeedStates'
import { SuggestedUsers, TrendingSpecies, UpcomingEvents } from '../components/inicio/InicioAside'
import './inicio.css'

export const INICIO_DEMO = import.meta.env.VITE_INICIO_MOCK === 'true'

export default function Inicio({ demo = INICIO_DEMO }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const feed = params.get('feed') === 'global' ? 'global' : 'para-ti'
  const q = params.get('q')?.trim() ?? ''
  const requestedPage = Number(params.get('page'))
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0
  const size = demo ? 2 : 10
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const feedRef = useRef(null)
  const key = JSON.stringify([demo, feed, q, page, retry])
  const visible = demo
    ? { status: 'success', data: adaptarPaginaPublicaciones(consultarDemo({ page, size, feed, q })) }
    : result?.key === key ? result : { status: 'loading', data: null }

  useEffect(() => {
    const controller = new AbortController()
    if (!demo) {
      consultarPublicaciones({ page, size, feed, q, signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) setResult({ key, status: 'success', data: adaptarPaginaPublicaciones(data) })
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ key, status: 'error', data: null })
        })
    }
    return () => controller.abort()
  }, [demo, feed, q, page, size, retry, key])

  function updateParams(changes, options) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [field, value] of Object.entries(changes)) {
        if (value == null || value === '' || value === 'para-ti' || (field === 'page' && value === 0)) next.delete(field)
        else next.set(field, String(value))
      }
      return next
    }, options)
  }

  function setPage(next) {
    updateParams({ page: next })
    feedRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  return <div className="inicio h-full min-h-0 overflow-hidden px-4 py-4 text-[var(--inicio-text)]">
    <h1 className="sr-only">Inicio</h1>
    <div className="mx-auto grid h-full w-full max-w-[1500px] min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_minmax(240px,27%)] gap-4">
      <div className="inicio-scroll min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-contain" id="inicio-feed" ref={feedRef}
        role="region" aria-label="Publicaciones del inicio" tabIndex={0}>
        <FeedFilters value={feed} onChange={(next) => updateParams({ feed: next, page: 0 })} />
        {demo && <p className="text-[10px] text-[var(--inicio-muted)]">Vista de demostración · publicaciones ilustrativas, no datos de MySQL</p>}
        <PostComposer user={user} />
        {visible.status === 'loading' && <FeedLoading />}
        {visible.status === 'error' && <FeedError onRetry={() => setRetry((value) => value + 1)} />}
        {visible.status === 'success' && <>
          {visible.data.content.length === 0
            ? <FeedEmpty filtered={Boolean(q) || feed === 'global'} onClear={() => updateParams({ q: null, feed: null, page: 0 })} />
            : <div className="grid gap-4">{visible.data.content.map((post) => <PublicationCard key={post.id} post={post} />)}</div>}
          <FeedPagination page={visible.data.number} totalPages={visible.data.totalPages}
            first={visible.data.first} last={visible.data.last} onChange={setPage} />
        </>}
      </div>
      <aside aria-label="Información complementaria" className="inicio-scroll grid min-h-0 min-w-0 content-start gap-3.5 overflow-y-auto overscroll-contain" tabIndex={0}>
        <SuggestedUsers users={demo ? sugerenciasDemo : []} />
        <TrendingSpecies species={demo ? tendenciasDemo : []} />
        <UpcomingEvents events={demo ? eventosDemo : []} />
        {!demo && <p className="text-[10px] text-[var(--inicio-muted)]">Sugerencias, tendencias y eventos pendientes de sus propias API.</p>}
      </aside>
    </div>
  </div>
}
