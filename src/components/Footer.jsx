import './Footer.css'

/**
 * App footer with attribution.
 */
export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <span>© {year} RemitFlow</span>
      <div className="footer-right">
        <a
          href="https://status.remitflow.app"
          className="footer-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Status
        </a>
        <span className="footer-note">Powered by the Stellar network</span>
      </div>
    </footer>
  )
}
