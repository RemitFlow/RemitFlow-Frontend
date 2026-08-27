// Quote service: combines FX rates and fees into a full transfer quote.
import { getRate, convert } from './fx.js';
import { FEE_PERCENT, FLAT_FEE, MIN_FEE } from '../constants/fees.js';
import { percentOf, roundTo } from '../utils/math.js';
import { parseCurrencyInput } from '../utils/format.js';

function canonical(value, currency) {
  const parsed = parseCurrencyInput(value, { currency, allowZero: true });
  return parsed.ok ? parsed.value : '0.00';
}

/**
 * Calculate the total fee (in the source currency) for a given send amount.
 * @param {number|string} amount - amount being sent in the source currency
 * @param {string} [currency] - ISO currency code
 * @returns {string} the canonical fee in the source currency
 */
export function calculateFee(amount, currency = 'USD') {
  const num = Number(canonical(amount, currency));
  const fee = percentOf(num, FEE_PERCENT) + FLAT_FEE;
  return canonical(roundTo(Math.max(fee, MIN_FEE)), currency);
}

/**
 * Build a full quote for a transfer.
 * @param {number|string} amount - amount to send in the source currency
 * @param {string} from - source currency code
 * @param {string} to - destination currency code
 * @returns {object|null} quote breakdown or null if the pair is unsupported
 */
export function buildQuote(amount, from, to) {
  const rate = getRate(from, to);
  if (rate == null) return null;

  const sendAmount = canonical(amount, from);
  const fee = calculateFee(sendAmount, from);
  const amountAfterFee = canonical(
    Math.max(Number(sendAmount) - Number(fee), 0),
    from,
  );
  const receiveAmount = canonical(convert(amountAfterFee, from, to), to);

  return {
    from,
    to,
    rate,
    sendAmount,
    fee,
    amountAfterFee,
    receiveAmount,
  };
}
