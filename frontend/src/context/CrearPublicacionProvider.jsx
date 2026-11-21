import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CrearPublicacionContext } from './CrearPublicacionContext'

// El modal se monta una sola vez en Inicio; desde otra sección volvemos al feed antes de abrirlo.
export function CrearPublicacionProvider({ children }) {
  const [abierto, setAbierto] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const abrir = useCallback(() => {
    if (location.pathname !== '/app') navigate('/app')
    setAbierto(true)
  }, [location.pathname, navigate])

  const cerrar = useCallback(() => setAbierto(false), [])

  const value = useMemo(() => ({ abierto, abrir, cerrar }), [abierto, abrir, cerrar])

  return <CrearPublicacionContext.Provider value={value}>{children}</CrearPublicacionContext.Provider>
}
