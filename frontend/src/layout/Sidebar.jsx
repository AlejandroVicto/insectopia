import { NavLink } from 'react-router-dom'
import RoleGate from '../auth/RoleGate'
import { ROUTE_ROLES } from '../auth/roles'

const mainLinks = [
  { label: 'Inicio', to: '/app', end: true, roles: ROUTE_ROLES.generales },
  { label: 'Mensajes', to: '/app/mensajes', roles: ROUTE_ROLES.generales },
  { label: 'Notificaciones', to: '/app/notificaciones', roles: ROUTE_ROLES.generales },
  { label: 'Eventos', to: '/app/eventos', roles: ROUTE_ROLES.generales },
  { label: 'Mi perfil', to: '/app/perfil', roles: ROUTE_ROLES.generales },
  { label: 'Moderación', to: '/moderacion', roles: ROUTE_ROLES.moderacion },
  { label: 'Administración', to: '/administracion', roles: ROUTE_ROLES.administracion },
]

function MenuLink({ label, to, end, count }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-entry ${isActive ? 'nav-entry-active' : ''}`}>
      <span aria-hidden="true" className="nav-dot" />
      <span>{label}{count != null && count > 0 ? ` · ${count}` : ''}</span>
    </NavLink>
  )
}

export default function Sidebar({ notificationCount, onLogout }) {
  return (
    <aside className="flex min-h-[calc(100vh-80px)] w-60 shrink-0 flex-col bg-[var(--nav-sidebar)] px-3 pb-4 pt-5 text-[var(--nav-light)]">
      <nav aria-label="Navegación principal" className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-[var(--nav-muted)]">MENÚ PRINCIPAL</p>
        {mainLinks.map(({ label, to, end, roles }) => (
          <RoleGate key={to} allowedRoles={roles}>
            <MenuLink label={label} to={to} end={end} count={label === 'Notificaciones' ? notificationCount : undefined} />
          </RoleGate>
        ))}
      </nav>
      <nav aria-label="Mi cuenta" className="mt-auto flex flex-col gap-2 border-t border-[var(--nav-active)] pt-4">
        <p className="text-[10px] font-semibold text-[var(--nav-muted)]">MI CUENTA</p>
        <MenuLink label="Configuración" to="/app/configuracion" />
        <button type="button" onClick={onLogout} className="nav-entry text-left">
          <span aria-hidden="true" className="nav-dot" />Cerrar sesión
        </button>
      </nav>
    </aside>
  )
}
