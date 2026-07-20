import { Link } from 'react-router-dom'
import WalletButton from './WalletButton.jsx'
import './Navbar.css'

/**
 * Top navigation bar with branding and the wallet connect button.
 * Main navigation links live in the Sidebar component.
 */
export default function Navbar() {
  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">✦</span>
        <span className="navbar-title">RemitFlow</span>
      </Link>

      <div className="navbar-actions">
        <WalletButton />
      </div>
    </header>
  )
}
