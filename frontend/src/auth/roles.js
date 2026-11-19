export const ROLES = Object.freeze({
  USUARIO: 'USUARIO',
  MODERADOR: 'MODERADOR',
  ADMINISTRADOR: 'ADMINISTRADOR',
})

export const ROUTE_ROLES = Object.freeze({
  generales: [ROLES.USUARIO, ROLES.MODERADOR, ROLES.ADMINISTRADOR],
  moderacion: [ROLES.MODERADOR, ROLES.ADMINISTRADOR],
  administracion: [ROLES.ADMINISTRADOR],
})

export function hasAllowedRole(role, allowedRoles) {
  return Object.values(ROLES).includes(role) && allowedRoles.includes(role)
}
