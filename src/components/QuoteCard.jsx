import { formatAmount, formatRate, formatPercent } from '../utils/format.js';
import { FEE_PERCENT } from '../constants/fees.js';
import { DEFAULT_LOCALE } from '../constants/locales.js';
import './QuoteCard.css';

/**
 * Displays the breakdown of an FX quote: rate, fee and amount received.
 *
 * In addition to the core send/fee/receive fields, it shows:
 * - The currency flags and full names for both source and destination
 * - The quote source (provider tag)
 * - A human-readable timestamp ("obtained at HH:MM:SS")
 * - The remaining time until the quote expires
 *
 * @param {object} props
 * @param {object} props.quote - enhanced quote object from buildQuote()
 * @param {string} [props.locale] - locale used for currency formatting
 * @param {number|null} [props.secsLeft] - seconds until the quote expires
 */
export default function QuoteCard({ quote, locale = DEFAULT_LOCALE, secsLeft = null }) {
  if (!quote) return null;

  const {
    from,
    to,
    fromMeta,
    toMeta,
    rate,
    sendAmount,
    fee,
    receiveAmount,
    source,
    timestamp,
  } = quote;

  // Format the timestamp for display (e.g. "14:03:27").
  const obtainedAt = timestamp
    ? new Date(timestamp).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  // Determine expiry display state.
  const isExpired = secsLeft !== null && secsLeft <= 0;
  const isExpiringSoon = !isExpired && secsLeft !== null && secsLeft <= 10;

  // Build a descriptive expiry label.
  let expiryLabel = null;
  if (isExpired) {
    expiryLabel = 'Expired';
  } else if (secsLeft !== null) {
    expiryLabel = `${secsLeft}s`;
  }

  return (
    <div className={`quote-card${isExpired ? ' quote-card--expired' : ''}`}>
      <h3 className="quote-title">Transfer summary</h3>

      {/* Currency corridor header */}
      <div className="quote-corridor">
        <span className="quote-currency">
          {fromMeta?.flag && (
            <span className="quote-flag" aria-hidden="true">
              {fromMeta.flag}
            </span>
          )}
          <span>{fromMeta?.name ?? from}</span>
          <span className="quote-code">({from})</span>
        </span>
        <span className="quote-corridor-arrow" aria-hidden="true">→</span>
        <span className="quote-currency">
          {toMeta?.flag && (
            <span className="quote-flag" aria-hidden="true">
              {toMeta.flag}
            </span>
          )}
          <span>{toMeta?.name ?? to}</span>
          <span className="quote-code">({to})</span>
        </span>
      </div>

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

      {/* Quote metadata footer */}
      <div className="quote-meta">
        {source && (
          <span className="quote-source" title="Quote provider">
            {source}
          </span>
        )}
        {obtainedAt && (
          <span className="quote-timestamp" title="Quote obtained at">
            obtained {obtainedAt}
          </span>
        )}
        {expiryLabel && (
          <span
            className={`quote-expiry${isExpired ? ' quote-expiry--expired' : isExpiringSoon ? ' quote-expiry--soon' : ''}`}
            aria-live="polite"
            aria-atomic="true"
            title="Time until quote expires"
          >
            {isExpired ? 'Quote expired' : `expires in ${expiryLabel}`}
          </span>
        )}
      </div>

      <p className="quote-note">
        Fees cover the RemitFlow service and Stellar network cost. Rates are
        indicative and locked for the duration shown above.
      </p>
    </div>
  );
}
