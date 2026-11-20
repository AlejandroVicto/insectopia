import Avatar from './Avatar'

const pending = 'Disponible cuando se implemente la creación de publicaciones (actividad 061).'

export default function PostComposer({ user }) {
  return <section aria-label="Nueva publicación" className="inicio-card p-4">
    <div className="flex items-start gap-3">
      <Avatar name={user?.name} src={user?.avatarUrl} />
      <button type="button" disabled title={pending} className="inicio-inset min-h-20 min-w-0 flex-1 rounded-xl px-4 py-3 text-left text-xs text-[var(--inicio-muted)] disabled:cursor-not-allowed">
        Comparte un nuevo avistamiento…
      </button>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="flex gap-2">
        <button type="button" disabled title={pending} className="inicio-pending">▣ &nbsp; Macro HD</button>
        <button type="button" disabled title={pending} className="inicio-pending">♧ &nbsp; Ubicación</button>
      </div>
      <button type="button" disabled title={pending} className="inicio-primary px-5 py-2 text-xs disabled:cursor-not-allowed">Publicar &nbsp; →</button>
    </div>
    <p className="sr-only">{pending}</p>
  </section>
}
