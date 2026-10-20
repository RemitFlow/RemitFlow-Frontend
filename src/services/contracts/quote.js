// Versioned contract for an FX quote.
//
// Amounts are decimal strings, not floats: a quote is a promise about exact
// numbers, and the receipt has to be able to reproduce them.

import { defineContract, parseOrThrow } from './schema.js';

export const QUOTE_CONTRACT_VERSION = 1;

/** How long a quote is honoured before it must be rebuilt. */
export const QUOTE_TTL_MS = 60_000;

export const quoteContract = defineContract({
  name: 'Quote',
  version: QUOTE_CONTRACT_VERSION,
  fields: {
    version: { type: 'integer', required: true },
    from: { type: 'currency', required: true },
    to: { type: 'currency', required: true },
    rate: { type: 'decimal', required: true, min: 0 },
    sendAmount: { type: 'decimal', required: true, min: 0 },
    fee: { type: 'decimal', required: true, min: 0 },
    amountAfterFee: { type: 'decimal', required: true, min: 0 },
    receiveAmount: { type: 'decimal', required: true, min: 0 },
    createdAt: { type: 'timestamp', required: true },
    expiresAt: { type: 'timestamp', required: true },
    // Freshness / provenance metadata. Required so a quote can always be
    // traced back to its feed and re-validated at signing time.
    source: { type: 'string', required: true },
    quoteId: { type: 'string', required: true, minLength: 1 },
    // Currency metadata: minor-unit precision for each side of the pair.
    fromMinorUnits: { type: 'integer', required: true, min: 0 },
    toMinorUnits: { type: 'integer', required: true, min: 0 },
    // The exact amount the user is agreeing to send, as a decimal string.
    canonicalAmount: { type: 'decimal', required: true, min: 0 },
  },
});

/**
 * Parse a quote payload, throwing an actionable diff if it does not match v1.
 * @param {unknown} raw
 * @param {{source?: string}} [options]
 * @returns {object}
 */
export function parseQuote(raw, options = {}) {
  return parseOrThrow(quoteContract, raw, options);
}

/**
 * Has a quote passed its expiry?
 * @param {object} quote - a parsed quote
 * @param {number|Date} [now] - injectable clock, so tests stay deterministic
 * @returns {boolean}
 */
export function isQuoteExpired(quote, now = Date.now()) {
  if (!quote?.expiresAt) return false;
  const expiry = Date.parse(quote.expiresAt);
  if (Number.isNaN(expiry)) return true;
  return (now instanceof Date ? now.getTime() : now) >= expiry;
}

/**
 * Quantize a decimal string to a given number of minor units, using
 * round-half-up on the digit after the last kept place. Returns a decimal
 * string with exactly `minorUnits` fraction digits, or null if unparseable.
 * @param {string} amount
 * @param {number} minorUnits
 * @returns {string|null}
 */
export function quantizeAmount(amount, minorUnits) {
  if (typeof amount !== 'string') return null;
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!match) return null;
  const [, sign, whole, frac = ''] = match;
  const places = Math.max(0, Math.trunc(minorUnits));
  const padded = frac.padEnd(places + 1, '0');
  const kept = padded.slice(0, places);
  const roundDigit = Number(padded[places] ?? '0');
  let digits = `${whole}${kept}`;
  if (roundDigit >= 5) {
    // Increment the integer representation of the kept digits.
    let carry = 1;
    const chars = digits.split('');
    for (let i = chars.length - 1; i >= 0 && carry; i -= 1) {
      const next = Number(chars[i]) + carry;
      chars[i] = String(next % 10);
      carry = next >= 10 ? 1 : 0;
    }
    digits = (carry ? '1' : '') + chars.join('');
  }
  const intPart = places > 0 ? digits.slice(0, digits.length - places) || '0' : digits;
  const fracPart = places > 0 ? digits.slice(digits.length - places) : '';
  const normalizedInt = intPart.replace(/^0+(?=\d)/, '');
  const result = places > 0 ? `${normalizedInt}.${fracPart}` : normalizedInt;
  return sign === '-' && /[1-9]/.test(result) ? `-${result}` : result;
}

/**
 * Validate a quote against the transfer the user is about to sign.
 *
 * Returns `{ valid, reasons }` where `reasons` is a list of stable machine
 * codes (plus human-readable detail) explaining every failure. A quote is
 * only valid when it is unexpired, matches the requested currency pair, and
 * its canonical amount reconciles with the requested amount at the source
 * currency's precision.
 *
 * @param {object} quote - a parsed quote
 * @param {{now?: number|Date, from?: string, to?: string, amount?: string}} [request]
 * @returns {{valid: boolean, reasons: Array<{code: string, message: string}>}}
 */
export function validateQuoteForTransfer(quote, request = {}) {
  const reasons = [];
  const { now = Date.now(), from, to, amount } = request;

  if (!quote) {
    return {
      valid: false,
      reasons: [{ code: 'missing_quote', message: 'No quote is available.' }],
    };
  }

  if (isQuoteExpired(quote, now)) {
    reasons.push({
      code: 'expired',
      message: `Quote expired at ${quote.expiresAt}.`,
    });
  }

  if (from != null && quote.from !== from) {
    reasons.push({
      code: 'from_mismatch',
      message: `Quote source currency ${quote.from} does not match requested ${from}.`,
    });
  }

  if (to != null && quote.to !== to) {
    reasons.push({
      code: 'to_mismatch',
      message: `Quote target currency ${quote.to} does not match requested ${to}.`,
    });
  }

  if (amount != null) {
    const minorUnits = Number.isInteger(quote.fromMinorUnits) ? quote.fromMinorUnits : 2;
    const expected = quantizeAmount(String(amount), minorUnits);
    const canonical = quantizeAmount(String(quote.canonicalAmount ?? ''), minorUnits);
    if (expected == null || canonical == null || expected !== canonical) {
      reasons.push({
        code: 'amount_mismatch',
        message: `Quote amount ${quote.canonicalAmount} does not reconcile with requested ${amount}.`,
      });
    }
  }

  return { valid: reasons.length === 0, reasons };
}
