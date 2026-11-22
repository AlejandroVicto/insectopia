import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { adaptarPerfil } from '../adapters/perfilAdapter'
import { adaptarPagina, adaptarSeguido } from '../adapters/mensajesAdapter'
import { consultarMiPerfil, consultarIdentidad, consultarSeguidos } from '../services/perfilService'
import { obtenerPaises } from '../services/catalogoService'
import Avatar from '../components/inicio/Avatar'
import PerfilUsuariosModal from '../components/perfil/PerfilUsuariosModal'
import './inicio.css'
import './mi-perfil.css'

function fechaRegistro(value) {
  if (!value || Number.isNaN(Date.parse(value))) return null
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(value))
}

export default function MiPerfil() {
  const { token } = useAuth()
  const [retry, setRetry] = useState(0)
  const [identity, setIdentity] = useState(null)
  const [countResult, setCountResult] = useState(null)
  const [country, setCountry] = useState(null)
  const [modal, setModal] = useState(null)
  const updateTotal = useCallback((total) => setCountResult({ status: 'success', total }), [])
  const profile = identity?.status === 'success' ? identity.profile : null

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
      const page = adaptarPagina(data, adaptarSeguido)
      if (!controller.signal.aborted) setCountResult({ status: 'success', total: page.totalElements })
    }).catch(() => { if (!controller.signal.aborted) setCountResult({ status: 'error' }) })
    return () => controller.abort()
  }, [token, retry])

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

  return <div className="inicio perfil min-h-full p-4 text-[var(--inicio-text)]" key={token}>
    <h1 className="sr-only">Mi perfil</h1>
    <div className="perfil-grid mx-auto max-w-[1500px]">
      <div className="min-w-0 space-y-5">
        {identity?.status === 'error' && <div className="inicio-card perfil-state" role="alert"><strong>No pudimos cargar tu perfil</strong>
          <p>Tu información no está disponible. Comprueba la conexión e inténtalo de nuevo.</p>
          <button type="button" className="perfil-secondary mt-4" onClick={() => { setIdentity(null); setCountResult(null); setRetry((n) => n + 1) }}>Reintentar</button></div>}
        {!identity && <div className="inicio-card perfil-state" role="status">Cargando tu perfil...</div>}
        {identity?.partial && <p role="status" className="perfil-note">Perfil completo pendiente de GET /api/usuarios/me. Solo se muestra la identidad confirmada por /api/auth/me; biografía, ubicación y estadísticas no están disponibles.</p>}
        {profile && <>
          <section className="inicio-card perfil-header" aria-label="Información de mi cuenta">
            <span className="perfil-big-avatar"><Avatar name={profile.nombre} src={profile.fotoPerfil} /></span>
            <div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold">{profile.nombre}</h2>
              <p className="break-words text-sm text-[var(--inicio-muted)]">@{profile.nombreUsuario}</p></div>
            <Link to="/app/configuracion?seccion=perfil" className="perfil-primary text-center">Editar perfil</Link>
          </section>
          <section className="inicio-card perfil-info"><h2>⌖ &nbsp;Ubicación</h2>
            <p>{location || 'Ubicación no disponible'}</p></section>
          <section className="inicio-card perfil-info"><h2>Biografía</h2>
            <p>{profile.biografia || (identity.partial ? 'Biografía no disponible: pendiente del endpoint de perfil.' : 'Todavía no has agregado una biografía')}</p></section>
        </>}
        <section aria-labelledby="perfil-posts-title" className="min-w-0">
          <h2 id="perfil-posts-title" className="mb-4 px-3 text-base font-bold">Mis Publicaciones</h2>
          <div className="inicio-card perfil-state" role="status"><strong>Publicaciones propias no disponibles</strong>
            <p>El backend todavía no ofrece una consulta paginada por el usuario autenticado. No se mostrarán publicaciones de otras personas ni resultados incompletos del feed.</p></div>
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
    {modal && <PerfilUsuariosModal tipo={modal} ownId={profile?.id} onClose={() => setModal(null)}
      onTotal={updateTotal} />}
  </div>
}
