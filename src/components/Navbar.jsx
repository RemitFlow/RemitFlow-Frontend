import { NavLink, Link } from 'react-router-dom'
import WalletButton from './WalletButton.jsx'
import LocaleSelect from './LocaleSelect.jsx'
import { useApp } from '../context/AppContext.jsx'
import './Navbar.css'

/**
 * Top navigation bar with links, the locale preference and the wallet
 * connect button.
 */
export default function Navbar() {
  const { locale, setLocale } = useApp()

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
    </header>
  )
}
