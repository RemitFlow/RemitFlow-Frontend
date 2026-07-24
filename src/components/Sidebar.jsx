import { NavLink } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import './Sidebar.css';

/**
 * Collapsible sidebar navigation.
 * Collapse state is persisted to localStorage so it survives reloads.
 */
export default function Sidebar() {
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={`sidebar-toggle-icon${collapsed ? ' sidebar-toggle-icon--flipped' : ''}`}
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 4L11.5 9L7 14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <NavLink to="/" end className="sidebar-link">
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 7L10 2L17 7V17H12V11H8V17H3V7Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="sidebar-link-label">Home</span>
        </NavLink>

        <NavLink to="/send" className="sidebar-link">
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 16L16 4M16 4H7M16 4V13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="sidebar-link-label">Send Money</span>
        </NavLink>

        <NavLink to="/transfers" className="sidebar-link">
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect
                x="2"
                y="4"
                width="16"
                height="13"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M2 8H18" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M6 12H11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="sidebar-link-label">Transfers</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-branding">
          {collapsed ? '✦' : '✦ RemitFlow'}
        </span>
      </div>
    </aside>
  );
}
