import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { contarNoLeidas } from '../services/notificacionesService'
import { NotificacionesContext } from './NotificacionesContext'

const POLL_MS = 45000

// Se monta por sesión desde PrivateLayout: ningún contador sobrevive a un cambio de cuenta.
export function NotificacionesProvider({ children }) {
  const [count, setCount] = useState(null)
  const [error, setError] = useState(false)
  const request = useRef(null)
  const sequence = useRef(0)

  const refreshCount = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const current = ++sequence.current
    try {
      const { data } = await contarNoLeidas({ signal: controller.signal })
      if (!Number.isSafeInteger(data?.count) || data.count < 0) throw new Error('Contador inválido')
      if (!controller.signal.aborted && current === sequence.current) {
        setCount(data.count)
        setError(false)
      }
    } catch {
      if (!controller.signal.aborted && current === sequence.current) {
        setCount(null)
        setError(true)
      }
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') refreshCount()
    }, POLL_MS)
    function onFocus() { if (document.visibilityState !== 'hidden') refreshCount() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const initial = window.setTimeout(refreshCount, 0)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      sequence.current += 1
      request.current?.abort()
    }
  }, [refreshCount])

  const value = useMemo(() => ({ count, error, refreshCount }), [count, error, refreshCount])
  return <NotificacionesContext.Provider value={value}>{children}</NotificacionesContext.Provider>
}
