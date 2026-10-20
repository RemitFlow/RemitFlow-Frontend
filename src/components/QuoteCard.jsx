import { formatRate, formatPercent } from '../utils/format.js';
import { formatMoney } from '../utils/money.js';
import { FEE_PERCENT } from '../constants/fees.js';
import { DEFAULT_LOCALE } from '../constants/locales.js';
import { isQuoteExpired } from '../utils/quote.js';
import './QuoteCard.css';

/**
 * Formats a timestamp (ms since epoch) for display, or a dash when absent.
 * @param {number|undefined} timestamp
 * @param {string} locale
 */
function formatTimestamp(timestamp, locale) {
  if (!Number.isFinite(timestamp)) return '—';
  try {
    return new Date(timestamp).toLocaleString(locale);
  } catch {
    return new Date(timestamp).toISOString();
  }
}

/**
 * Displays the breakdown of an FX quote: rate, fee and amount received,
 * plus quote provenance (source, timestamps, currency metadata, canonical
 * amount) and any validation warnings.
 * @param {object} props
 * @param {object} props.quote - quote object from buildQuote()
 * @param {string} [props.locale] - locale used for currency formatting
 * @param {number} [props.now] - clock used to evaluate expiry (ms since epoch)
 * @param {boolean} [props.invalid] - whether validateQuoteForTransfer failed
 * @param {string[]} [props.reasons] - validation failure reasons
 */
export default function QuoteCard({
  quote,
  locale = DEFAULT_LOCALE,
  now = Date.now(),
  invalid = false,
  reasons = [],
}) {
  if (!quote) return null;

  const {
    from,
    to,
    rate,
    sendAmount,
    fee,
    receiveAmount,
    source,
    createdAt,
    expiresAt,
    fromMeta,
    toMeta,
    canonicalAmount,
  } = quote;

  const expired = isQuoteExpired(quote, now);
  const showWarnings = invalid || expired;

  return (
    <div className="quote-card">
      <h3 className="quote-title">Transfer summary</h3>

      <div className="quote-line quote-muted">
        <span>Quote source</span>
        <span>{source || '—'}</span>
      </div>

      <div className="quote-line quote-muted">
        <span>Created</span>
        <span>{formatTimestamp(createdAt, locale)}</span>
      </div>

      <div
        className={`quote-line quote-muted${expired ? ' quote-expired' : ''}`}
      >
        <span>Expires</span>
        <span>
          {formatTimestamp(expiresAt, locale)}
          {expired ? ' (expired)' : ''}
        </span>
      </div>

      <div className="quote-line quote-muted">
        <span>From currency</span>
        <span>
          {from}
          {fromMeta?.name ? ` — ${fromMeta.name}` : ''}
          {Number.isFinite(fromMeta?.minorUnits)
            ? ` (${fromMeta.minorUnits} minor units)`
            : ''}
        </span>
      </div>

      <div className="quote-line quote-muted">
        <span>To currency</span>
        <span>
          {to}
          {toMeta?.name ? ` — ${toMeta.name}` : ''}
          {Number.isFinite(toMeta?.minorUnits)
            ? ` (${toMeta.minorUnits} minor units)`
            : ''}
        </span>
      </div>

      <div className="quote-line quote-muted">
        <span>Canonical amount</span>
        <span>{canonicalAmount ?? '—'}</span>
      </div>

      {showWarnings && (
        <ul className="quote-warnings" role="alert">
          {expired && <li>This quote has expired. Refresh to get a new rate.</li>}
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="quote-line">
        <span>You send</span>
        <span>{formatMoney(sendAmount, from, locale)}</span>
      </div>

      <div className="quote-line quote-muted">
        <span>RemitFlow fee ({formatPercent(FEE_PERCENT, 1)} + flat)</span>
        <span>- {formatMoney(fee, from, locale)}</span>
      </div>

      <div className="quote-line quote-muted">
        <span>Exchange rate</span>
        <span>{formatRate(rate, from, to)}</span>
      </div>

      <div className="quote-divider" />

      <div className="quote-line quote-total">
        <span>Recipient gets</span>
        <span>{formatMoney(receiveAmount, to, locale)}</span>
      </div>

      <p className="quote-note">
        Fees cover the RemitFlow service and Stellar network cost. Rates are
        indicative and update at confirmation.
      </p>
    </div>
  );
}
