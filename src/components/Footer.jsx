import './Footer.css'

/**
 * App footer with attribution.
 */
export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <span>© {year} RemitFlow</span>
      <span className="footer-note">Powered by the Stellar network</span>
    </footer>
  )
}
