import { CLASE_ERROR, CLASE_ETIQUETA, CLASE_PISTA } from '../../constants/modalesPublicaciones'

export default function CampoModal({ id, etiqueta, error, pista, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={CLASE_ETIQUETA}>{etiqueta}</label>
      {children}
      {error
        ? <p id={`${id}-error`} role="alert" className={CLASE_ERROR}>{error}</p>
        : pista ? <p id={`${id}-pista`} className={CLASE_PISTA}>{pista}</p> : null}
    </div>
  )
}
