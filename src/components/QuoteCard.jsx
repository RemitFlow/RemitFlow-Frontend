import { formatAmount, formatRate, formatPercent } from '../utils/format.js'
import { FEE_PERCENT } from '../constants/fees.js'
import { DEFAULT_LOCALE } from '../constants/locales.js'
import './QuoteCard.css'

/**
 * Displays the breakdown of an FX quote: rate, fee and amount received.
 * @param {object} props
 * @param {object} props.quote - quote object from buildQuote()
 * @param {string} [props.locale] - locale used for currency formatting
 */
export default function QuoteCard({ quote, locale = DEFAULT_LOCALE }) {
  if (!quote) return null

  const { from, to, rate, sendAmount, fee, receiveAmount } = quote

  return (
    <div className="quote-card">
      <h3 className="quote-title">Transfer summary</h3>

      <div className="quote-line">
        <span>You send</span>
        <span>{formatAmount(sendAmount, from, locale)}</span>
      </div>

      <div className="quote-line quote-muted">
        <span>RemitFlow fee ({formatPercent(FEE_PERCENT, 1)} + flat)</span>
        <span>- {formatAmount(fee, from, locale)}</span>
      </div>

      <div className="quote-line quote-muted">
        <span>Exchange rate</span>
        <span>{formatRate(rate, from, to)}</span>
      </div>

      <div className="quote-divider" />

      <div className="quote-line quote-total">
        <span>Recipient gets</span>
        <span>{formatAmount(receiveAmount, to, locale)}</span>
      </div>

      <p className="quote-note">
        Fees cover the RemitFlow service and Stellar network cost. Rates are
        indicative and update at confirmation.
      </p>
    </div>
  )
}
