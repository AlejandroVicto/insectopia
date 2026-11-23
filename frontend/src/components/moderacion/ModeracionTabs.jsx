import { useRef } from 'react'

const SECCIONES_MODERACION = Object.freeze([
  { id: 'eventos', label: 'Eventos pendientes' },
  { id: 'reportes', label: 'Reportes' },
])

export default function ModeracionTabs({ value, onChange }) {
  const botones = useRef({})

  function manejarTeclado(event, indice) {
    let siguiente = null
    if (event.key === 'ArrowRight') siguiente = (indice + 1) % SECCIONES_MODERACION.length
    else if (event.key === 'ArrowLeft') siguiente = (indice - 1 + SECCIONES_MODERACION.length) % SECCIONES_MODERACION.length
    else if (event.key === 'Home') siguiente = 0
    else if (event.key === 'End') siguiente = SECCIONES_MODERACION.length - 1
    if (siguiente === null) return

    event.preventDefault()
    const seccion = SECCIONES_MODERACION[siguiente]
    onChange(seccion.id)
    botones.current[seccion.id]?.focus()
  }

  return (
    <div role="tablist" aria-label="Secciones de moderación" className="mod-tabs">
      {SECCIONES_MODERACION.map((seccion, indice) => (
        <button
          key={seccion.id}
          ref={(nodo) => { botones.current[seccion.id] = nodo }}
          type="button"
          role="tab"
          id={`mod-tab-${seccion.id}`}
          aria-selected={value === seccion.id}
          aria-controls={`mod-panel-${seccion.id}`}
          tabIndex={value === seccion.id ? 0 : -1}
          onClick={() => onChange(seccion.id)}
          onKeyDown={(event) => manejarTeclado(event, indice)}
          className={`mod-tab ${value === seccion.id ? 'mod-tab--activo' : ''}`}
        >
          {seccion.label}
        </button>
      ))}
    </div>
  )
}
