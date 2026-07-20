// Mock FX rate service. In production these rates would come from the backend
// or an on-chain Stellar DEX path-payment quote.

// Rates expressed relative to 1 USD.
const USD_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1480.5,
  INR: 83.2,
  PHP: 58.4,
  MXN: 17.1,
};

export function getRate(from, to) {
  const fromRate = USD_RATES[from];
  const toRate = USD_RATES[to];
  if (!fromRate || !toRate) return null;
  return toRate / fromRate;
}

export function convert(amount, from, to) {
  const rate = getRate(from, to);
  if (rate == null) return null;
  return Number(amount) * rate;
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
