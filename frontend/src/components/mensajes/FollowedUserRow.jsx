import { Avatar } from './ConversationsList'

export default function FollowedUserRow({ person, selected, onSelect, ownId }) {
  const allowed = person.loSigo === true && String(person.id) !== String(ownId)
  return <button type="button" className={`msg-follow-row ${selected ? 'selected' : ''}`} aria-pressed={selected}
    disabled={!allowed} title={!allowed ? 'No se puede iniciar una conversación con esta persona' : undefined}
    onClick={() => onSelect(person)}>
    <Avatar person={person} /><span className="msg-follow-copy"><strong>{person.nombre}</strong>
      <span>@{person.nombreUsuario}{person.descripcion ? ` · ${person.descripcion}` : ''}</span></span>
    <span className="msg-follow-check" aria-hidden="true">{selected ? '✓' : ''}</span>
  </button>
}
