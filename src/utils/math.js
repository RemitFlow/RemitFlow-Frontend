// Small numeric helpers used across quotes and validation.

/**
 * Clamp a number to an inclusive range.
 * @param {number} value - the value to clamp
 * @param {number} min - lower bound
 * @param {number} max - upper bound
 * @returns {number} the clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to a fixed number of decimal places.
 * @param {number} value - the value to round
 * @param {number} [decimals] - number of decimal places
 * @returns {number} the rounded value
 */
export function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/**
 * Calculate a percentage of a base amount.
 * @param {number} amount - the base amount
 * @param {number} percent - the percentage as a fraction (0.05 = 5%)
 * @returns {number} the resulting portion
 */
export function percentOf(amount, percent) {
  return Number(amount) * Number(percent);
}
