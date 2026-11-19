import { useAuth } from './useAuth'
import { hasAllowedRole } from './roles'

// Visibility only: the backend must enforce the same operation's permissions.
export default function RoleGate({ allowedRoles, children, fallback = null }) {
  const { isAuthenticated, role } = useAuth()
  return isAuthenticated && hasAllowedRole(role, allowedRoles) ? children : fallback
}
