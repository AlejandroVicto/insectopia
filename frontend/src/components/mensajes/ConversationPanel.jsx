import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Avatar } from './ConversationsList'
import { EmptyState, ErrorState, LoadingState } from './MessageStates'

function dateLabel(value) {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function MessageList({ messages, userId, chatId, hasMore, loadingMore, onMore, olderError }) {
  const scroll = useRef(null)
  const previous = useRef(null)
  useLayoutEffect(() => {
    const node = scroll.current
    if (!node) return
    const previousValue = previous.current
    if (!previousValue || previousValue.chatId !== chatId) node.scrollTop = node.scrollHeight
    else if (messages.length && previousValue.first !== String(messages[0].id)) {
      node.scrollTop += node.scrollHeight - previousValue.height
    } else if (previousValue.nearBottom && messages.length > previousValue.length) node.scrollTop = node.scrollHeight
    previous.current = { chatId, first: messages[0] ? String(messages[0].id) : null, length: messages.length,
      height: node.scrollHeight, nearBottom: node.scrollHeight - node.scrollTop - node.clientHeight < 96 }
  }, [chatId, messages])

  function trackScroll() {
    const node = scroll.current
    if (previous.current && node) previous.current.nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 96
  }
  return <div ref={scroll} onScroll={trackScroll} className="msg-history" role="region" aria-label="Historial de mensajes" tabIndex={0}>
    {hasMore && <button className="msg-action msg-more" type="button" disabled={loadingMore} onClick={onMore}>{loadingMore ? 'Cargando…' : 'Cargar mensajes anteriores'}</button>}
    {olderError && <p role="alert" className="msg-inline-error">No se pudieron cargar los mensajes anteriores. <button type="button" onClick={onMore}>Reintentar</button></p>}
    {messages.map((message, index) => {
      const day = dateLabel(message.fechaEnvio)
      const own = String(message.remitenteId) === String(userId)
      const previous = messages[index - 1]
      const separator = !previous || day !== dateLabel(previous.fechaEnvio)
      const author = separator || own !== (String(previous.remitenteId) === String(userId))
      return <div key={message.id}>
        {separator && <div className="msg-date"><span>{day}</span></div>}
        {author && <p className={`msg-author ${own ? 'own' : ''}`}>{own ? 'TÚ' : 'MENSAJES RECIBIDOS'}</p>}
        <div className={`msg-row ${own ? 'own' : ''}`}><div className={`msg-bubble ${own ? 'own' : ''}`}>
          <p>{message.contenido}</p><time dateTime={message.fechaEnvio}>{new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.fechaEnvio))}</time>
        </div></div>
        {message.fechaLectura && own && <p className="msg-read">Visto · {new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.fechaLectura))}</p>}
      </div>
    })}
    {!messages.length && <EmptyState title="Empieza la conversación">Todavía no hay mensajes en este chat.</EmptyState>}
  </div>
}

function Composer({ demo, ready, draft, onDraft, onSend, sending, sendError }) {
  return <form className="msg-composer" onSubmit={(event) => { event.preventDefault(); if (!demo) onSend() }}>
    <label htmlFor="msg-draft" className="sr-only">Escribe un mensaje</label>
    <textarea id="msg-draft" value={draft} onChange={(event) => onDraft(event.target.value)} placeholder="Escribe un mensaje…" rows="2"
      onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
        event.preventDefault(); if (!demo) onSend()
      } }} />
    <button type="submit" className="msg-send" disabled={demo || !ready || sending || !draft.trim()} title={demo ? 'Envío deshabilitado: datos de demostración' : undefined}
      aria-label={sending ? 'Enviando mensaje' : 'Enviar mensaje'}>➤</button>
    {sendError && <p role="alert" className="msg-inline-error">{sendError} Puedes reintentar sin perder el texto.</p>}
  </form>
}

function ConversationOptions({ onHide }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const action = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    action.current?.focus()
    function dismiss(event) {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus() }
      if (event.type === 'pointerdown' && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', dismiss) }
  }, [open])
  return <div ref={root} className="msg-options"><button ref={trigger} type="button" aria-label="Opciones de conversación"
    aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>•••</button>
    {open && <div role="menu" aria-label="Gestionar conversación" className="msg-options-menu">
      <button ref={action} role="menuitem" type="button" onClick={() => { setOpen(false); trigger.current?.focus(); onHide() }}>Ocultar conversación</button>
    </div>}</div>
}

export default function ConversationPanel({ chat, history, userId, demo, draft, onDraft, onSend, sending, sendError, onRetry, onMore, onOptions }) {
  return <section className="msg-card msg-panel" aria-label="Conversación seleccionada">
    {!chat ? <EmptyState title="Selecciona una conversación">Elige un chat de la lista para ver sus mensajes.</EmptyState> : <>
      <header className="msg-panel-header"><Avatar person={chat.interlocutor} /><div className="msg-header-details"><h2 className="font-display">{chat.interlocutor.nombre}</h2>
        <p>@{chat.interlocutor.nombreUsuario}{chat.interlocutor.loSigo === true ? ' · Sigues a esta persona' : ''}</p></div>
        <ConversationOptions key={chat.id} onHide={onOptions} /></header>
      {history?.status === 'loading' && <div className="msg-history"><LoadingState label="Cargando historial" /></div>}
      {history?.status === 'error' && <div className="msg-history"><ErrorState onRetry={onRetry} /></div>}
      {history?.status === 'success' && <MessageList messages={history.messages} userId={userId} chatId={chat.id}
        hasMore={history.hasMore} loadingMore={history.loadingMore} olderError={history.olderError} onMore={onMore} />}
      <Composer demo={demo} ready={history?.status === 'success'} draft={draft} onDraft={onDraft} onSend={onSend} sending={sending} sendError={sendError} />
    </>}
  </section>
}
