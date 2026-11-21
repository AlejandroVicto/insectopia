import { useContext } from 'react'
import { CrearPublicacionContext } from './CrearPublicacionContext'

export function useCrearPublicacion() {
  const value = useContext(CrearPublicacionContext)
  if (!value) throw new Error('useCrearPublicacion debe usarse dentro de CrearPublicacionProvider')
  return value
}
