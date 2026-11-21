import ModalContainer from '../modales/ModalContainer'

export default function ConfirmarNotificacionModal({ action, loading, error, onCancel, onConfirm }) {
  const bulk = action === 'todas'
  return <ModalContainer
    titleId="notif-modal-title" descriptionId="notif-modal-description"
    title={bulk ? '¿Marcar todas como leídas?' : '¿Eliminar notificación?'}
    description={bulk ? 'El contador de pendientes se actualizará únicamente después de una respuesta correcta de la API.'
      : 'La notificación se eliminará de tu actividad. Esta acción no se puede deshacer.'}
    onClose={onCancel} closeDisabled={loading}>
    <div className="notif-modal-body">
      {error && <p role="alert" className="notif-inline-error">{error}</p>}
      <div className="notif-modal-actions">
        <button type="button" data-modal-autofocus onClick={onCancel} disabled={loading} className="notif-secondary">Cancelar</button>
        <button type="button" onClick={onConfirm} disabled={loading} className="notif-primary">
          {loading ? 'Procesando…' : bulk ? 'Marcar todas' : 'Eliminar'}
        </button>
      </div>
    </div>
  </ModalContainer>
}
