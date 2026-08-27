// Quote service: combines FX rates and fees into a full transfer quote.
//
// All arithmetic runs on integer minor units. The old implementation chained
// float operations (percentOf -> roundTo -> subtract -> multiply), so the
// receive amount carried accumulated binary error and the stored value did not
// always equal the quoted one. Here every intermediate is exact and every
// output is quantized to the real minor unit of its currency.

import { getRateDecimal } from './fx.js';
import { FEE_PERCENT, FLAT_FEE, MIN_FEE } from '../constants/fees.js';
import {
  QUOTE_CONTRACT_VERSION,
  QUOTE_TTL_MS,
  parseQuote,
} from './contracts/quote.js';
import {
  convertMinorUnits,
  currencyExponent,
  fromMinorUnits,
  parseDecimal,
  scaleMinorUnits,
  toMinorUnits,
} from '../utils/money.js';

/**
 * Calculate the total fee (in the source currency) for a given send amount.
 * @param {number|string} amount - amount being sent in the source currency
 * @param {string} [currency] - source currency, for minor-unit precision
 * @returns {string|null} fee as a decimal string, or null if `amount` is not
 *   a parseable decimal
 */
export function calculateFee(amount, currency = 'USD') {
  const parsed = parseDecimal(amount);
  if (!parsed.ok) return null;

  const exponent = currencyExponent(currency);
  const sendMinor = toMinorUnits(parsed.value, exponent);
  const percentMinor = scaleMinorUnits(sendMinor, FEE_PERCENT);
  const flatMinor = toMinorUnits(FLAT_FEE, exponent);
  const minMinor = toMinorUnits(MIN_FEE, exponent);

  const feeMinor = percentMinor + flatMinor;
  return fromMinorUnits(feeMinor > minMinor ? feeMinor : minMinor, exponent);
}

/**
 * Build a full quote for a transfer.
 * @param {number|string} amount - amount to send in the source currency
 * @param {string} from - source currency code
 * @param {string} to - destination currency code
 * @param {{now?: number|Date, ttlMs?: number}} [options] - injectable clock so
 *   quote expiry is deterministic under test
 * @returns {object|null} a Quote v1 payload, or null when the pair is
 *   unsupported or the amount is not a parseable decimal
 */
export function buildQuote(amount, from, to, options = {}) {
  const rate = getRateDecimal(from, to);
  if (rate == null) return null;

  const parsed = parseDecimal(amount);
  if (!parsed.ok) return null;

  const fromExponent = currencyExponent(from);
  const toExponent = currencyExponent(to);

  const sendMinor = toMinorUnits(parsed.value, fromExponent);
  const feeMinor = toMinorUnits(calculateFee(parsed.value, from), fromExponent);
  const afterFeeMinor = sendMinor > feeMinor ? sendMinor - feeMinor : 0n;
  const receiveMinor = convertMinorUnits(
    afterFeeMinor,
    rate,
    fromExponent,
    toExponent,
  );

  const nowMs =
    options.now instanceof Date
      ? options.now.getTime()
      : (options.now ?? Date.now());
  const ttlMs = options.ttlMs ?? QUOTE_TTL_MS;

  // Round-trip through the contract so a quote is validated at the point it is
  // produced, not only at the point it is consumed.
  return parseQuote(
    {
      version: QUOTE_CONTRACT_VERSION,
      from,
      to,
      rate,
      sendAmount: fromMinorUnits(sendMinor, fromExponent),
      fee: fromMinorUnits(feeMinor, fromExponent),
      amountAfterFee: fromMinorUnits(afterFeeMinor, fromExponent),
      receiveAmount: fromMinorUnits(receiveMinor, toExponent),
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + ttlMs).toISOString(),
    },
    { source: 'buildQuote' },
  );
}
