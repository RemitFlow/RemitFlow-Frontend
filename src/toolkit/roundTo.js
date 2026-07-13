/**
 * Round n to d decimal places.
 */
export const roundTo = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
