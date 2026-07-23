import Button from '../components/Button.jsx'
import { POPULAR_CORRIDORS, getCurrency } from '../constants/currencies.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import './Home.css'

// Selling points shown on the landing page.
const FEATURES = [
  {
    icon: '⚡',
    title: 'Fast settlement',
    text: 'Transfers settle in seconds on the Stellar network, not days.'
  },
  {
    icon: '💸',
    title: 'Low fees',
    text: 'A flat, transparent fee — no hidden FX markups.'
  },
  {
    icon: '🌍',
    title: 'Global reach',
    text: 'Send to friends and family across supported corridors.'
  }
]

/**
 * Marketing landing page.
 */
export default function Home() {
  useDocumentTitle('Home')

  return (
    <div className="home">
      <section className="hero">
        <h1 className="hero-title">
          Send money home, <span className="hero-accent">instantly</span>.
        </h1>
        <p className="hero-subtitle">
          RemitFlow uses the Stellar network to move money across borders in
          seconds, with low and transparent fees.
        </p>
        <div className="hero-actions">
          <Button to="/send">Send Money</Button>
          <Button to="/transfers" variant="secondary">
            View Transfers
          </Button>
        </div>
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-text">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="corridors">
        <h2 className="corridors-title">Popular corridors</h2>
        <ul className="corridors-list">
          {POPULAR_CORRIDORS.map(({ from, to }) => {
            const src = getCurrency(from)
            const dest = getCurrency(to)
            return (
              <li key={`${from}-${to}`} className="corridor-chip">
                <span>{src?.flag} {from}</span>
                <span className="corridor-arrow" aria-hidden="true">→</span>
                <span>{dest?.flag} {to}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
