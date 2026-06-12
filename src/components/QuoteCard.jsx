import { formatAmount, formatRate } from '../utils/format.js'
import './QuoteCard.css'

/**
 * Displays the breakdown of an FX quote: rate, fee and amount received.
 * @param {object} props
 * @param {object} props.quote - quote object from buildQuote()
 */
export default function QuoteCard({ quote }) {
  if (!quote) return null

  const { from, to, rate, sendAmount, fee, receiveAmount } = quote

  return (
    <div className="quote-card">
      <h3 className="quote-title">Transfer summary</h3>

      <div className="quote-line">
        <span>You send</span>
        <span>{formatAmount(sendAmount, from)}</span>
      </div>

      <div className="quote-line quote-muted">
        <span>RemitFlow fee</span>
        <span>- {formatAmount(fee, from)}</span>
      </div>

      <div className="quote-line quote-muted">
        <span>Exchange rate</span>
        <span>{formatRate(rate, from, to)}</span>
      </div>

      <div className="quote-divider" />

      <div className="quote-line quote-total">
        <span>Recipient gets</span>
        <span>{formatAmount(receiveAmount, to)}</span>
      </div>

      <p className="quote-note">
        Fees cover the RemitFlow service and Stellar network cost. Rates are
        indicative and update at confirmation.
      </p>
    </div>
  )
}
