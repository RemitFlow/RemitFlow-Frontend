// Quote service: combines FX rates and fees into a full transfer quote.
import { getRate, convert } from './fx.js';
import { getCurrency } from '../constants/currencies.js';
import { FEE_PERCENT, FLAT_FEE, MIN_FEE } from '../constants/fees.js';
import { percentOf, roundTo } from '../utils/math.js';

/**
 * How long (in milliseconds) a quote is considered valid before it must be
 * refreshed. Chosen to be short enough that the rate is fresh at confirmation
 * but long enough to not interrupt normal form completion.
 */
export const QUOTE_TTL_MS = 30_000; // 30 seconds

/** Identify the source of quotes; useful for display and debugging. */
export const QUOTE_SOURCE = 'RemitFlow/mock-v1';

/**
 * Generate a lightweight, collision-resistant quote identifier.
 * Not a cryptographic UUID — just enough to bind a quote to a payload.
 * @returns {string}
 */
export function generateQuoteId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 9);
  return `q_${ts}_${rand}`;
}

/**
 * Calculate the total fee (in the source currency) for a given send amount.
 * @param {number} amount - amount being sent in the source currency
 * @returns {number} the fee in the source currency
 */
export function calculateFee(amount) {
  const num = Number(amount) || 0;
  const fee = percentOf(num, FEE_PERCENT) + FLAT_FEE;
  return roundTo(Math.max(fee, MIN_FEE));
}

/**
 * Build a full quote for a transfer.
 *
 * The returned object includes:
 * - `quoteId`       unique identifier for this specific quote snapshot
 * - `source`        identifies the quote provider (mock vs. live)
 * - `timestamp`     Unix epoch ms when the quote was generated
 * - `expiresAt`     Unix epoch ms when the quote expires (timestamp + QUOTE_TTL_MS)
 * - `from`          source currency code
 * - `to`            destination currency code
 * - `fromMeta`      full currency metadata for the source (name, symbol, flag)
 * - `toMeta`        full currency metadata for the destination
 * - `rate`          exchange rate: 1 unit of `from` in `to`
 * - `sendAmount`    canonical send amount (number, parsed once here)
 * - `fee`           total fee in source currency
 * - `amountAfterFee`send amount minus fee
 * - `receiveAmount` amount the recipient receives in destination currency
 *
 * @param {number|string} amount - amount to send in the source currency
 * @param {string} from - source currency code
 * @param {string} to - destination currency code
 * @returns {object|null} quote breakdown or null if the pair is unsupported
 */
export function buildQuote(amount, from, to) {
  const rate = getRate(from, to);
  if (rate == null) return null;

  const fromMeta = getCurrency(from);
  const toMeta = getCurrency(to);

  const sendAmount = roundTo(Number(amount) || 0, 2);
  const fee = calculateFee(sendAmount);
  const amountAfterFee = roundTo(Math.max(sendAmount - fee, 0), 2);
  const receiveAmount = roundTo(convert(amountAfterFee, from, to) ?? 0, 2);

  const timestamp = Date.now();

  return {
    quoteId: generateQuoteId(),
    source: QUOTE_SOURCE,
    timestamp,
    expiresAt: timestamp + QUOTE_TTL_MS,
    from,
    to,
    fromMeta: fromMeta ?? { code: from, name: from, symbol: from, flag: '' },
    toMeta: toMeta ?? { code: to, name: to, symbol: to, flag: '' },
    rate,
    sendAmount,
    fee,
    amountAfterFee,
    receiveAmount,
  };
}

/**
 * Returns true when the given quote has passed its expiry time.
 * @param {object|null} quote - a quote returned by buildQuote()
 * @returns {boolean}
 */
export function isQuoteExpired(quote) {
  if (!quote) return true;
  return Date.now() >= quote.expiresAt;
}

/**
 * Returns true when the quote's currency pair and canonical amount still
 * match the current form values.  A mismatch means the user changed the
 * form after the quote was generated and the quote must be refreshed.
 *
 * @param {object|null} quote
 * @param {string} from
 * @param {string} to
 * @param {number|string} amount
 * @returns {boolean}
 */
export function isQuoteStale(quote, from, to, amount) {
  if (!quote) return true;
  const canonical = roundTo(Number(amount) || 0, 2);
  return (
    quote.from !== from ||
    quote.to !== to ||
    quote.sendAmount !== canonical
  );
}
