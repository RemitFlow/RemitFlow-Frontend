import { NavLink, Link } from 'react-router-dom';
import WalletButton from './WalletButton.jsx';
import LocaleSelect from './LocaleSelect.jsx';
import { useApp } from '../context/AppContext.jsx';
import './Navbar.css';
import { useState, useEffect, useCallback } from 'react'
import { NavLink, Link } from 'react-router-dom'
import WalletButton from './WalletButton.jsx'
import LocaleSelect from './LocaleSelect.jsx'
import { useApp } from '../context/AppContext.jsx'
import './Navbar.css'

export default function Navbar() {
  const { locale, setLocale } = useApp();
  const { locale, setLocale } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [menuOpen, closeMenu])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">✦</span>
        RemitFlow
      </Link>

      <nav className="navbar-links">
        <NavLink to="/" end className="navbar-link">
          Home
        </NavLink>
        <NavLink to="/send" className="navbar-link">
          Send Money
        </NavLink>
        <NavLink to="/transfers" className="navbar-link">
          Transfers
        </NavLink>
      </nav>

      <div className="navbar-actions">
        <LocaleSelect
          value={locale}
          onChange={setLocale}
          id="navbar-locale"
          ariaLabel="Language & region"
        />
        <WalletButton />
      </div>

      <button
        type="button"
        className="navbar-hamburger"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        <span className="navbar-hamburger-line" />
        <span className="navbar-hamburger-line" />
        <span className="navbar-hamburger-line" />
      </button>

      {menuOpen && (
        <div className="navbar-backdrop" onClick={closeMenu} />
      )}

      <aside
        className={`navbar-drawer${menuOpen ? ' navbar-drawer--open' : ''}`}
        aria-label="Mobile navigation"
      >
        <nav className="navbar-drawer-nav">
          <NavLink to="/" end className="navbar-drawer-link" onClick={closeMenu}>
            <span className="navbar-drawer-link-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 7L10 2L17 7V17H12V11H8V17H3V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </span>
            Home
          </NavLink>
          <NavLink to="/send" className="navbar-drawer-link" onClick={closeMenu}>
            <span className="navbar-drawer-link-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 16L16 4M16 4H7M16 4V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Send Money
          </NavLink>
          <NavLink to="/transfers" className="navbar-drawer-link" onClick={closeMenu}>
            <span className="navbar-drawer-link-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 8H18" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 12H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            Transfers
          </NavLink>
        </nav>

        <div className="navbar-drawer-actions">
          <LocaleSelect
            value={locale}
            onChange={setLocale}
            id="drawer-locale"
            ariaLabel="Language & region"
          />
          <WalletButton />
        </div>
      </aside>
    </header>
  );
}
  )
}
