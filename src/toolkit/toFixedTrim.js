/**
 * Fixed decimals without trailing zeros.
 */
export const toFixedTrim = (n, d = 2) => parseFloat(n.toFixed(d));
