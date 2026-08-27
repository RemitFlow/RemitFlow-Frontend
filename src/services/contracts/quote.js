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
