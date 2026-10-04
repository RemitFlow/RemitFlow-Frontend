import { formatRate, formatPercent } from '../utils/format.js';
import { formatMoney } from '../utils/money.js';
import { FEE_PERCENT } from '../constants/fees.js';
import { DEFAULT_LOCALE } from '../constants/locales.js';
import { getCurrency } from '../constants/currencies.js';
import { quoteSecondsRemaining } from '../utils/quoteBinding.js';
import { isQuoteExpired } from '../services/contracts/quote.js';
import './QuoteCard.css';

/**
 * Displays the breakdown of an FX quote: rate, fee and amount received,
 * plus freshness metadata (source, timestamps, currency precision).
 * @param {object} props
 * @param {object} props.quote - quote object from buildQuote()
 * @param {string} [props.locale] - locale used for currency formatting
 * @param {number|Date} [props.now] - injectable clock for expiry display
 * @param {Function} [props.onRefresh] - optional refresh handler when expired
 */
export default function QuoteCard({
  quote,
  locale = DEFAULT_LOCALE,
  now = Date.now(),
  onRefresh,
}) {
  if (!quote) return null;

  const { from, to, rate, sendAmount, fee, receiveAmount, source, id } = quote;
  const fromMeta = getCurrency(from);
  const toMeta = getCurrency(to);
  const expired = isQuoteExpired(quote, now);
  const secondsLeft = quoteSecondsRemaining(quote, now);
  const createdLabel = formatTimestamp(quote.createdAt, locale);
  const expiresLabel = formatTimestamp(quote.expiresAt, locale);

  return (
    <div
      className={`quote-card${expired ? ' quote-card--expired' : ''}`}
      data-quote-id={id || undefined}
      data-quote-expired={expired ? 'true' : 'false'}
    >
      <h3 className="quote-title">Transfer summary</h3>

      <div className="quote-meta" aria-label="Quote details">
        <div className="quote-meta-line">
          <span>Source</span>
          <span>{source || 'unknown'}</span>
        </div>
        {id && (
          <div className="quote-meta-line">
            <span>Quote id</span>
            <span className="quote-mono">{shortId(id)}</span>
          </div>
        )}
        <div className="quote-meta-line">
          <span>Priced at</span>
          <span>{createdLabel}</span>
        </div>
        <div className="quote-meta-line">
          <span>Expires</span>
          <span>
            {expiresLabel}
            {!expired && secondsLeft > 0 ? ` · ${secondsLeft}s left` : ''}
          </span>
        </div>
        <div className="quote-meta-line">
          <span>Currencies</span>
          <span>
            {fromMeta
              ? `${fromMeta.flag} ${from} (${fromMeta.minorUnits}dp)`
              : from}{' '}
            → {toMeta ? `${toMeta.flag} ${to} (${toMeta.minorUnits}dp)` : to}
          </span>
        </div>
      </div>

      {expired && (
        <div className="quote-expired-banner" role="status">
          This quote has expired.
          {onRefresh ? (
            <>
              {' '}
              <button
                type="button"
                className="quote-refresh"
                onClick={onRefresh}
              >
                Refresh quote
              </button>
            </>
          ) : (
            ' Refresh to continue.'
          )}
        </div>
      )}

      <div className="quote-line">
        <span>You send</span>
        <span data-testid="quote-send-amount">
          {formatMoney(sendAmount, from, locale)}
        </span>
      </div>

      <div className="quote-line quote-muted">
        <span>RemitFlow fee ({formatPercent(FEE_PERCENT, 1)} + flat)</span>
        <span data-testid="quote-fee">- {formatMoney(fee, from, locale)}</span>
      </div>

      <div className="quote-line quote-muted">
        <span>Exchange rate</span>
        <span>{formatRate(rate, from, to)}</span>
      </div>

      <div className="quote-divider" />

      <div className="quote-line quote-total">
        <span>Recipient gets</span>
        <span data-testid="quote-receive-amount">
          {formatMoney(receiveAmount, to, locale)}
        </span>
      </div>

      <p className="quote-note">
        Fees cover the RemitFlow service and Stellar network cost. Rates are
        indicative; confirmation uses the bound quote id until it expires.
      </p>
    </div>
  );
}

function formatTimestamp(iso, locale) {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

function shortId(id) {
  if (!id || id.length <= 16) return id;
  return `${id.slice(0, 10)}…${id.slice(-4)}`;
}
