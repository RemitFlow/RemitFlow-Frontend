// Mock FX rate service. In production these rates would come from the backend
// or an on-chain Stellar DEX path-payment quote.
//
// Rates are held as decimal *strings* and cross rates are derived by exact
// decimal division. Quoting EUR->NGN as `1480.5 / 0.92` in binary floating
// point yields 1609.2391304347825, which is already wrong in the last place;
// at NGN scale that error is visible on a receipt.

import { divideDecimal, parseDecimal } from '../utils/money.js';

// Rates expressed relative to 1 USD.
const USD_RATES = {
  USD: '1',
  EUR: '0.92',
  GBP: '0.79',
  NGN: '1480.5',
  INR: '83.2',
  PHP: '58.4',
  MXN: '17.1',
};

/**
 * Cross rate as an exact decimal string: units of `to` per 1 unit of `from`.
 * @param {string} from - source currency code
 * @param {string} to - destination currency code
 * @returns {string|null} decimal string, or null when the pair is unsupported
 */
export function getRateDecimal(from, to) {
  const fromRate = USD_RATES[from];
  const toRate = USD_RATES[to];
  if (!fromRate || !toRate) return null;
  if (from === to) return '1';
  return divideDecimal(toRate, fromRate);
}

/**
 * Cross rate as a number. Convenient for display and charting; do not use it
 * for money arithmetic — use getRateDecimal() with the helpers in utils/money.
 * @param {string} from
 * @param {string} to
 * @returns {number|null}
 */
export function getRate(from, to) {
  const decimal = getRateDecimal(from, to);
  return decimal == null ? null : Number(decimal);
}

/**
 * Convert an amount between currencies.
 * @param {number|string} amount
 * @param {string} from
 * @param {string} to
 * @returns {number|null} null when the pair is unsupported or the amount is
 *   not a parseable decimal — never a silently coerced zero
 */
export function convert(amount, from, to) {
  const rate = getRateDecimal(from, to);
  if (rate == null) return null;
  const parsed = parseDecimal(amount);
  if (!parsed.ok) return null;
  return Number(parsed.value) * Number(rate);
}

/**
 * Get the rate for the reverse direction (1 unit of `to` in `from`).
 * @param {string} from
 * @param {string} to
 * @returns {number|null}
 */
export function getInverseRate(from, to) {
  return getRate(to, from);
}

/**
 * List the supported currency codes that have a quoted rate.
 * @returns {string[]}
 */
export function listRatedCurrencies() {
  return Object.keys(USD_RATES);
}
