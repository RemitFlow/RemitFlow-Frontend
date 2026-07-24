// Quote service: combines FX rates and fees into a full transfer quote.
import { getRate, convert } from './fx.js';
import { FEE_PERCENT, FLAT_FEE, MIN_FEE } from '../constants/fees.js';
import { percentOf, roundTo } from '../utils/math.js';

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
 * @param {number} amount - amount to send in the source currency
 * @param {string} from - source currency code
 * @param {string} to - destination currency code
 * @returns {object|null} quote breakdown or null if the pair is unsupported
 */
export function buildQuote(amount, from, to) {
  const rate = getRate(from, to);
  if (rate == null) return null;

  const sendAmount = Number(amount) || 0;
  const fee = calculateFee(sendAmount);
  const amountAfterFee = Math.max(sendAmount - fee, 0);
  const receiveAmount = convert(amountAfterFee, from, to);

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
