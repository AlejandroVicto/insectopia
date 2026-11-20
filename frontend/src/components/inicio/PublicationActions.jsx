const formatCount = (count) => count == null ? '—' : new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(count)

export default function PublicationActions({ post }) {
  const pending = 'Disponible cuando el backend implemente las interacciones del feed.'
  const actions = [
    { label: 'Me gusta', icon: '♡', count: post.totalReacciones },
    { label: 'Comentar', icon: '▤', count: post.totalComentarios },
    { label: 'Compartir', icon: '⇧', count: null },
  ]
  return <div className="flex flex-wrap items-center gap-2" aria-label="Interacciones de la publicación">
    {actions.map(({ label, icon, count }) => <button key={label} type="button" disabled title={pending}
      aria-label={`${label}${count == null ? '' : `: ${count}`}`}
      className="inicio-action disabled:cursor-not-allowed" aria-pressed={label === 'Me gusta' ? Boolean(post.reaccionUsuario) : undefined}>
      <span aria-hidden="true" className="text-base">{icon}</span>{label === 'Compartir' ? label : formatCount(count)}
    </button>)}
  </div>
}
