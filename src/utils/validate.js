// Simple validation helpers for the Send Money form.

export function isPositiveAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
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
 * @param {number|string} amount
 * @param {number} balance
 * @returns {boolean}
 */
export function isWithinBalance(amount, balance) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return false;
  return num <= Number(balance);
}
