// Simple validation helpers for the Send Money form.
import { parseCurrencyInput } from './format.js';

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
