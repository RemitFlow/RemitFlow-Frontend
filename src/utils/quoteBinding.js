/**
 * Quote binding helpers for the send flow.
 *
 * A quote is only signable when it is still fresh, matches the live form
 * inputs (amount + corridor), and its displayed amounts reconcile with the
 * serialized payload. Field or network changes invalidate a pending quote.
 */

import { getCurrency, getCurrencyMinorUnits } from '../constants/currencies.js';
import { isQuoteExpired } from '../services/contracts/quote.js';
import { getRateDecimal } from '../services/fx.js';
import { parseDecimal } from './money.js';

let quoteIdSequence = 0;

/**
 * Mint a quote id. When `seed` is provided the id is content-addressed so the
 * same priced inputs at the same clock reproduce the same id (tests and
 * rebuilds stay stable). Without a seed the id is random.
 * @param {string} [seed]
 * @returns {string}
 */
export function mintQuoteId(seed) {
  if (seed != null && seed !== '') {
    return `qt_${fnv1a(String(seed))}`;
  }
  if (globalThis.crypto?.randomUUID) {
    return `qt_${globalThis.crypto.randomUUID()}`;
  }
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(12);
    globalThis.crypto.getRandomValues(bytes);
    return `qt_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return `qt_${Date.now().toString(36)}_${(++quoteIdSequence).toString(36)}`;
}

function fnv1a(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Canonical fingerprint of the inputs a quote was priced against.
 * @param {{amount: string|number, from: string, to: string}} inputs
 * @returns {string}
 */
export function quoteInputFingerprint(inputs) {
  const amount = normalizeAmount(inputs?.amount);
  const from = String(inputs?.from ?? '').toUpperCase();
  const to = String(inputs?.to ?? '').toUpperCase();
  return JSON.stringify([amount, from, to]);
}

function normalizeAmount(value) {
  if (value === undefined || value === null || value === '') return '';
  const parsed = parseDecimal(value);
  return parsed.ok ? parsed.value : String(value);
}

/**
 * Validate that both currencies are supported and form a priced corridor.
 * @param {string} from
 * @param {string} to
 * @returns {{ok: true, fromMeta: object, toMeta: object, rate: string}|{ok: false, error: string}}
 */
export function validateCurrencyPair(from, to) {
  const fromCode = String(from ?? '').toUpperCase();
  const toCode = String(to ?? '').toUpperCase();
  const fromMeta = getCurrency(fromCode);
  const toMeta = getCurrency(toCode);

  if (!fromMeta) {
    return {
      ok: false,
      error: `Unsupported source currency: ${fromCode || '(empty)'}.`,
    };
  }
  if (!toMeta) {
    return {
      ok: false,
      error: `Unsupported destination currency: ${toCode || '(empty)'}.`,
    };
  }
  if (fromCode === toCode) {
    return { ok: false, error: 'Source and destination must differ.' };
  }

  const rate = getRateDecimal(fromCode, toCode);
  if (rate == null) {
    return {
      ok: false,
      error: `No rate available for ${fromCode} → ${toCode}.`,
    };
  }

  return { ok: true, fromMeta, toMeta, rate };
}

/**
 * Does the quote still match the live form inputs?
 * @param {object} quote
 * @param {{amount: string|number, from: string, to: string}} inputs
 */
export function isQuoteBoundToInputs(quote, inputs) {
  if (!quote) return false;
  const expected = quoteInputFingerprint(inputs);
  if (quote.inputFingerprint) {
    return quote.inputFingerprint === expected;
  }
  // Fallback for quotes minted without an explicit fingerprint: compare the
  // priced fields directly so a currency swap still invalidates the binding.
  return (
    normalizeAmount(quote.sendAmount) === normalizeAmount(inputs?.amount) &&
    String(quote.from ?? '').toUpperCase() ===
      String(inputs?.from ?? '').toUpperCase() &&
    String(quote.to ?? '').toUpperCase() ===
      String(inputs?.to ?? '').toUpperCase()
  );
}

/**
 * Displayed card amounts must equal the amounts we are about to serialize.
 * Compared as canonical decimals so float noise cannot pass a mismatch.
 * @param {object} displayed
 * @param {object} serialized
 */
export function amountsReconcile(displayed, serialized) {
  if (!displayed || !serialized) return false;
  const fields = ['sendAmount', 'fee', 'receiveAmount', 'rate'];
  return fields.every((field) => {
    const left = normalizeAmount(displayed[field]);
    const right = normalizeAmount(serialized[field]);
    return left !== '' && left === right;
  });
}

/**
 * Decide whether a quote may be confirmed / signed.
 * @param {object} quote
 * @param {{amount: string|number, from: string, to: string}} inputs
 * @param {number|Date} [now]
 * @returns {{ok: true}|{ok: false, reason: string, code: string}}
 */
export function assertQuoteSignable(quote, inputs, now = Date.now()) {
  if (!quote?.id) {
    return {
      ok: false,
      code: 'missing_quote_id',
      reason: 'Quote is missing an id and cannot be confirmed.',
    };
  }

  const corridor = validateCurrencyPair(inputs?.from, inputs?.to);
  if (!corridor.ok) {
    return { ok: false, code: 'currency_matrix', reason: corridor.error };
  }

  if (
    String(quote.from).toUpperCase() !== String(inputs.from).toUpperCase() ||
    String(quote.to).toUpperCase() !== String(inputs.to).toUpperCase()
  ) {
    return {
      ok: false,
      code: 'currency_mismatch',
      reason: 'Quote currencies no longer match the form. Refresh the quote.',
    };
  }

  const precision = getCurrencyMinorUnits(inputs.from);
  const parsedAmount = parseDecimal(inputs.amount);
  if (!parsedAmount.ok) {
    return { ok: false, code: 'precision', reason: parsedAmount.error };
  }
  const sendParsed = parseDecimal(quote.sendAmount);
  if (!sendParsed.ok || sendParsed.value !== parsedAmount.value) {
    return {
      ok: false,
      code: 'changed_input',
      reason: 'Amount changed after the quote was priced. Refresh the quote.',
    };
  }
  // Reject amounts that would exceed the currency's minor-unit precision when
  // re-serialized (defensive: parseDecimal already canonicalises).
  const fraction = parsedAmount.value.split('.')[1] ?? '';
  if (fraction.length > precision) {
    return {
      ok: false,
      code: 'precision',
      reason: `${inputs.from} amounts support at most ${precision} decimal places.`,
    };
  }

  if (!isQuoteBoundToInputs(quote, inputs)) {
    return {
      ok: false,
      code: 'changed_input',
      reason: 'Quote no longer matches the form inputs. Refresh the quote.',
    };
  }

  if (isQuoteExpired(quote, now)) {
    return {
      ok: false,
      code: 'expired',
      reason: 'This quote has expired. Refresh it before confirming.',
    };
  }

  // Validate quote amounts independently. Reconciliation happens at the
  // send boundary, where a separately assembled payload exists to compare.
  const amountFields = ['sendAmount', 'fee', 'receiveAmount', 'rate'];
  if (amountFields.some((field) => !parseDecimal(quote[field]).ok)) {
    return {
      ok: false,
      code: 'reconcile',
      reason: 'Quote amounts are invalid and cannot be confirmed.',
    };
  }

  return { ok: true };
}

/**
 * Seconds remaining until expiry (floored, never negative).
 * @param {object} quote
 * @param {number|Date} [now]
 */
export function quoteSecondsRemaining(quote, now = Date.now()) {
  if (!quote?.expiresAt) return 0;
  const expiry = Date.parse(quote.expiresAt);
  if (Number.isNaN(expiry)) return 0;
  const current = now instanceof Date ? now.getTime() : now;
  return Math.max(0, Math.floor((expiry - current) / 1000));
}
