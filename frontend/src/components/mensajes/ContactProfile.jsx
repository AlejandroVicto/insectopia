import { Avatar } from './ConversationsList'
import { EmptyState } from './MessageStates'

export default function ContactProfile({ chat, onHide }) {
  return <aside className="msg-profile" aria-label="Perfil del interlocutor">
    {!chat ? <div className="msg-card"><EmptyState title="Sin perfil seleccionado">Selecciona una conversación para ver el perfil público de la otra persona.</EmptyState></div> : <>
      <section className="msg-card msg-person"><h2 className="msg-eyebrow">PERFIL DE LA CONVERSACIÓN</h2>
        <Avatar person={chat.interlocutor} large /><h3 className="font-display">{chat.interlocutor.nombre}</h3>
        {chat.interlocutor.id === null ? <div className="msg-person-bottom"><span>Cuenta eliminada</span><small>Su perfil ya no está disponible; puedes consultar los mensajes conservados.</small></div> : <>
          <p>@{chat.interlocutor.nombreUsuario}</p>
          {chat.interlocutor.loSigo != null && <span className="msg-follow">{chat.interlocutor.loSigo ? '✓ Lo sigues' : 'No lo sigues'}</span>}
          <div className="msg-person-bottom"><span>Perfil público</span><small>Solo nombre, alias y foto pública. Acceso pendiente de una ruta válida.</small></div>
        </>}
      </section>
       <section className="msg-card msg-about"><h2 className="msg-eyebrow">ACERCA DE ESTE CHAT</h2><p><span>◎</span><strong>Conversación directa<small>{chat.interlocutor.id === null ? 'Historial archivado' : 'Entre dos participantes'}</small></strong></p>
        <p><span>♧</span><strong>Solo los miembros ven mensajes</strong></p></section>
      <section className="msg-card msg-manage"><h2 className="msg-eyebrow">GESTIONAR CONVERSACIÓN</h2>
        <button type="button" onClick={onHide}>▤ &nbsp; Ocultar conversación</button>
        <p>No elimina los mensajes de la otra persona.</p></section>
    </>}
  </aside>
}
