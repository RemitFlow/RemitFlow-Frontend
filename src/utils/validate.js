// Simple validation helpers for the Send Money form.
import { parseCurrencyInput } from './format.js';
import {
  isQuoteValid,
  getQuoteCurrencyPair,
  getQuoteCanonicalAmount,
} from './quote.js';

export function isPositiveAmount(value, options = {}) {
  return parseCurrencyInput(value, options).ok;
}

export function isEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateRecipient(value) {
  if (!value) return false;
  // Accept either an email or a Stellar public key (starts with G, 56 chars).
  if (isEmail(value)) return true;
  return /^G[A-Z2-7]{55}$/.test(value);
}

/**
 * Check that an amount does not exceed the available balance.
 *
 * Compared exactly rather than as floats: at the boundary, `0.1 + 0.2 <= 0.3`
 * is false in binary floating point, which would reject a spend of exactly the
 * whole balance.
 *
 * @param {number|string} amount
 * @param {number|string} balance
 * @returns {boolean} false when either value is not a parseable decimal
 */
export function isWithinBalance(amount, balance, options = {}) {
  const parsedAmount = parseCurrencyInput(amount, options);
  const parsedBalance = parseCurrencyInput(balance, {
    ...options,
    allowZero: true,
  });
  if (!parsedAmount.ok || !parsedBalance.ok) return false;
  return parsedAmount.minorUnits <= parsedBalance.minorUnits;
}

/**
 * Validate that a quote may be used to sign a transfer for the given form
 * inputs.
 *
 * Centralises the expiry, currency-pair, and precision checks used by the
 * Send Money flow so they stay consistent and unit-testable. Returns a list of
 * human-readable reasons (empty when valid) so callers can surface why a quote
 * was rejected.
 *
 * @param {object} quote FX quote from the backend.
 * @param {object} [form]
 * @param {number|string} [form.now] Current time (ms since epoch); defaults to Date.now().
 * @param {string} [form.from] Source currency code entered in the form.
 * @param {string} [form.to] Destination currency code entered in the form.
 * @param {number|string} [form.amount] Amount entered in the form (source currency).
 * @param {string} [form.locale] Locale used when parsing the amount.
 * @returns {{ valid: boolean, reasons: string[] }}
 */
export function validateQuoteForTransfer(quote, form = {}) {
  const reasons = [];

  if (!quote || typeof quote !== 'object') {
    return { valid: false, reasons: ['missing-quote'] };
  }

  const now = form.now === undefined ? Date.now() : form.now;

  // Delegate expiry/status checks to the quote contract.
  if (!isQuoteValid(quote, { now })) {
    reasons.push('quote-invalid');
  }

  // Verify the quote's currency pair matches the form's from/to.
  const pair = getQuoteCurrencyPair(quote);
  const from = form.from;
  const to = form.to;
  if (!pair || !from || !to) {
    reasons.push('currency-mismatch');
  } else if (pair.from !== from || pair.to !== to) {
    reasons.push('currency-mismatch');
  }

  // Verify the quote's canonical amount equals the form amount quantized to
  // the source currency's minor unit.
  const canonical = getQuoteCanonicalAmount(quote);
  const parsedAmount = parseCurrencyInput(form.amount, {
    locale: form.locale,
    currency: from,
  });
  if (!parsedAmount.ok) {
    reasons.push('amount-invalid');
  } else if (canonical === undefined || canonical === null) {
    reasons.push('amount-mismatch');
  } else if (String(canonical) !== String(parsedAmount.minorUnits)) {
    reasons.push('amount-mismatch');
  }

  return { valid: reasons.length === 0, reasons };
}