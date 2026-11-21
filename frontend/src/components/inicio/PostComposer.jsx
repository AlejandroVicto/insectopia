import Avatar from './Avatar'

const pendiente = 'La creación de publicaciones está disponible en la vista conectada al backend.'

export default function PostComposer({ user, demo = false, onOpen }) {
  const habilitado = !demo
  const titulo = habilitado ? 'Registrar observación' : pendiente
  return <section aria-label="Nueva publicación" className="inicio-card p-4">
    <div className="flex items-start gap-3">
      <Avatar name={user?.name} src={user?.avatarUrl} />
      <button type="button" disabled={!habilitado} title={titulo} onClick={onOpen}
        className="inicio-inset min-h-20 min-w-0 flex-1 rounded-xl px-4 py-3 text-left text-xs text-[var(--inicio-muted)] disabled:cursor-not-allowed">
        Comparte un nuevo avistamiento…
      </button>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="flex gap-2">
        <button type="button" disabled={!habilitado} title="Selecciona y previsualiza una imagen; adjuntarla al envío aún no está disponible" onClick={onOpen} className="inicio-pending">▣ &nbsp; Macro HD</button>
        <button type="button" disabled title="La ubicación aún no está disponible" className="inicio-pending">♧ &nbsp; Ubicación</button>
      </div>
      <button type="button" aria-label="Publicar" disabled={!habilitado} title={titulo} onClick={onOpen}
        className="inicio-primary px-5 py-2 text-xs disabled:cursor-not-allowed">Publicar &nbsp; →</button>
    </div>
    {demo && <p className="sr-only">{pendiente}</p>}
  </section>
}
