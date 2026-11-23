import Avatar from '../inicio/Avatar'

/** Presentación compartida de identidad, ubicación y biografía; las acciones las decide la pantalla. */
export default function PerfilResumen({ profile, location, action, publico = false, parcial = false }) {
  return <>
    <section className="inicio-card perfil-header" aria-label={publico ? 'Información pública del usuario' : 'Información de mi cuenta'}>
      <span className="perfil-big-avatar"><Avatar name={profile.nombre} src={profile.fotoPerfil} /></span>
      <div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold">{profile.nombre}</h2>
        <p className="break-words text-sm text-[var(--inicio-muted)]">@{profile.nombreUsuario}</p></div>
      {action}
    </section>
    {!publico || location ? <section className="inicio-card perfil-info"><h2>⌖ &nbsp;Ubicación</h2>
      <p>{location || 'Ubicación no disponible'}</p></section> : null}
    <section className="inicio-card perfil-info"><h2>Biografía</h2>
      <p>{profile.biografia || (publico ? 'Sin biografía pública' : parcial ? 'Biografía no disponible: pendiente del endpoint de perfil.' : 'Todavía no has agregado una biografía')}</p></section>
  </>
}
