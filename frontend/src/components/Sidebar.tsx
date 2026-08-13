import { NavLink } from 'react-router-dom';

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Documentos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" />
        <path d="M8 3v18M12 8l2 1.5L12 11" />
      </svg>
    ),
  },
  {
    to: '/upload',
    label: 'Subir documento',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M4 20h16" />
      </svg>
    ),
  },
];

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 11h18M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
            <path d="M5 15h14a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1Z" />
          </svg>
        </div>
        {!collapsed && <span className="sidebar__title">Gastos</span>}
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__icon">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar__footer">
          <span className="sidebar__footer-text">Prueba técnica · Backend</span>
        </div>
      )}
    </aside>
  );
}
