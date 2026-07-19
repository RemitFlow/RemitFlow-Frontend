import { NavLink, Link } from 'react-router-dom'
import WalletButton from './WalletButton.jsx'
import DensityToggle from './DensityToggle.jsx'
import './Navbar.css'

/**
 * Top navigation bar with links and the wallet connect button.
 */
export default function Navbar() {
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
        <DensityToggle />
        <WalletButton />
      </div>
    </header>
  )
}
