const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null
export function avatarUrl(value) {
  const url = text(value)
  if (!url || !(url.startsWith('/') || /^https?:\/\//i.test(url))) return null
  try {
    const parsed = new URL(url, 'https://insectopia.invalid')
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null
  } catch { return null }
}

export function adaptarPerfil(raw) {
  const id = raw?.idUsuario ?? raw?.id
  const nombre = text(raw?.nombre ?? raw?.name)
  const nombreUsuario = text(raw?.nombreUsuario)
  if (id == null || !nombre || !nombreUsuario) throw new Error('DTO de perfil inválido')
  return {
    id, nombre, nombreUsuario, fotoPerfil: avatarUrl(raw?.fotoPerfil ?? raw?.avatarUrl),
    biografia: text(raw?.biografia), paisCodigo: text(raw?.paisCodigo),
    estadoRegion: text(raw?.estadoRegion), fechaRegistro: text(raw?.fechaRegistro),
    seguidores: count(raw?.totalSeguidores), seguidos: count(raw?.totalSeguidos),
    publicaciones: count(raw?.totalPublicaciones),
  }
}
