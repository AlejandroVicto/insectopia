import { useState } from 'react'
import { EmptyState, ErrorState, LoadingState } from './MessageStates'

export function Avatar({ person, large = false }) {
  const [failed, setFailed] = useState(null)
  const name = person?.nombre || 'Usuario'
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  return <span className={`msg-avatar ${large ? 'msg-avatar-lg' : ''}`}>
    {person?.avatarUrl && failed !== person.avatarUrl
      ? <img src={person.avatarUrl} alt={`Avatar de ${name}`} onError={() => setFailed(person.avatarUrl)} />
      : <span role="img" aria-label={`Avatar de ${name}`}>{initials}</span>}</span>
}

function time(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toDateString() === new Date().toDateString()
    ? new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(date)
    : new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(date)
}

export default function ConversationsList({ chats, selectedId, onSelect, draft, onSearch, filter, onFilter,
  status, onRetry, onMore, hasMore, loadingMore, moreError, onNew }) {
  return <section className="msg-card msg-conversations" aria-label="Tus conversaciones">
    <div className="msg-list-top"><h2>TUS CONVERSACIONES</h2><button type="button" className="msg-new" onClick={onNew}>＋ Nuevo</button></div>
    <div className="msg-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Buscar conversación" placeholder="Buscar conversación…"
      value={draft} onChange={(event) => onSearch(event.target.value)} />
      {draft && <button type="button" onClick={() => onSearch('')} aria-label="Limpiar búsqueda">×</button>}</div>
    <div className="msg-filters" aria-label="Filtrar conversaciones">
      <button type="button" className={filter === 'todos' ? 'active' : ''} aria-pressed={filter === 'todos'} onClick={() => onFilter('todos')}>Todos</button>
      <button type="button" className={filter === 'no-leidos' ? 'active' : ''} aria-pressed={filter === 'no-leidos'} onClick={() => onFilter('no-leidos')}>No leídos</button>
    </div>
    <div className="msg-conversation-scroll" role="region" aria-label="Lista de conversaciones" tabIndex={0}>
      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState onRetry={onRetry} />}
      {status === 'success' && <>
        <p className="msg-eyebrow msg-count">{chats.length} CHATS {draft || filter === 'no-leidos' ? 'ENCONTRADOS' : 'RECIENTES'}</p>
        {chats.map((chat) => <button type="button" key={chat.id} className={`msg-conversation ${String(selectedId) === String(chat.id) ? 'selected' : ''}`}
          aria-pressed={String(selectedId) === String(chat.id)} onClick={() => onSelect(chat)}>
          <Avatar person={chat.interlocutor} /><span className="msg-conversation-copy"><strong>{chat.interlocutor.nombre}</strong>
            <span>{chat.ultimoMensaje?.contenido || 'Sin mensajes todavía'}</span></span>
          <span className="msg-conversation-meta"><time>{time(chat.ultimoMensaje?.fechaEnvio)}</time>
            {chat.noLeidos > 0 && <span className="msg-badge" aria-label={`${chat.noLeidos} mensajes no leídos`}>{chat.noLeidos}</span>}</span>
        </button>)}
        {!chats.length && (draft || filter === 'no-leidos'
          ? <EmptyState title="Sin resultados">No hay conversaciones que coincidan con tu búsqueda o filtro.
            {draft && <button className="msg-action" type="button" onClick={() => onSearch('')}>Limpiar búsqueda</button>}</EmptyState>
          : <EmptyState title="Aún no tienes conversaciones">Escribe a una persona que sigues para iniciar tu primer chat.
            <button className="msg-action" type="button" onClick={onNew}>+ Nuevo mensaje</button></EmptyState>)}
        {hasMore && <button className="msg-action msg-more" type="button" disabled={loadingMore} onClick={onMore}>{loadingMore ? 'Cargando…' : 'Cargar más conversaciones'}</button>}
        {moreError && <p role="alert" className="msg-inline-error">No se pudieron cargar más conversaciones. <button type="button" onClick={onMore}>Reintentar</button></p>}
      </>}
    </div>
    <div className="msg-list-footer"><div><strong>¿Aún no has iniciado chats?</strong><span>Pulsa «Nuevo» para escribir a alguien que sigues.</span></div><small>Búsqueda y filtros funcionan sobre tus chats.</small></div>
  </section>
}
