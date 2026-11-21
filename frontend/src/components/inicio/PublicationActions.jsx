const formatCount = (count) => count == null ? '—' : new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(count)

const pendiente = 'Disponible cuando el backend implemente las interacciones del feed.'

export default function PublicationActions({ post, demo = false, onComentar, onReaccion, reaccionando = false }) {
  const actions = [
    {
      label: 'Me gusta',
      icon: post.reaccionUsuario ? '♥' : '♡',
      count: post.totalReacciones,
      disabled: demo || reaccionando,
      pressed: Boolean(post.reaccionUsuario),
      title: demo ? pendiente : (post.reaccionUsuario ? 'Quitar me gusta' : 'Me gusta'),
      onClick: () => onReaccion?.(post),
    },
    {
      label: 'Comentar',
      icon: '▤',
      count: post.totalComentarios,
      disabled: demo,
      pressed: undefined,
      title: demo ? pendiente : 'Ver y escribir comentarios',
      onClick: () => onComentar?.(post),
    },
    {
      label: 'Compartir',
      icon: '⇧',
      count: null,
      disabled: true,
      pressed: undefined,
      title: pendiente,
      onClick: undefined,
    },
  ]

  return <div className="flex flex-wrap items-center gap-2" aria-label="Interacciones de la publicación">
    {actions.map(({ label, icon, count, disabled, pressed, title, onClick }) => <button key={label} type="button"
      disabled={disabled} title={title} onClick={onClick}
      aria-label={`${label}${count == null ? '' : `: ${count}`}`}
      className="inicio-action disabled:cursor-not-allowed" aria-pressed={pressed}>
      <span aria-hidden="true" className="text-base">{icon}</span>{label === 'Compartir' ? label : formatCount(count)}
    </button>)}
  </div>
}
