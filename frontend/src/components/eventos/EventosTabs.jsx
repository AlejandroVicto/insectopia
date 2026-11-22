import { useRef } from 'react'

export default function EventosTabs({ tabs, value, onChange }) {
  const bots = useRef([])

  function manejarTeclado(evento, indice) {
    let siguiente = null
    if (evento.key === 'ArrowRight') siguiente = (indice + 1) % tabs.length
    if (evento.key === 'ArrowLeft') siguiente = (indice - 1 + tabs.length) % tabs.length
    if (evento.key === 'Home') siguiente = 0
    if (evento.key === 'End') siguiente = tabs.length - 1
    if (siguiente === null) return
    evento.preventDefault()
    bots.current[siguiente]?.focus()
    onChange(tabs[siguiente].id)
  }

  return (
    <div role="tablist" aria-label="Pestañas de eventos" className="evt-tabs">
      {tabs.map((tab, indice) => (
        <button
          key={tab.id}
          ref={(nodo) => { bots.current[indice] = nodo }}
          type="button"
          role="tab"
          id={`evt-tab-${tab.id}`}
          aria-controls="eventos-panel"
          aria-selected={value === tab.id}
          tabIndex={value === tab.id ? 0 : -1}
          className={`evt-tab ${value === tab.id ? 'evt-tab--activo' : ''}`}
          onClick={() => onChange(tab.id)}
          onKeyDown={(evento) => manejarTeclado(evento, indice)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
