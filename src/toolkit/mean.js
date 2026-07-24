/**
 * Arithmetic mean of an array.
 */
export const mean = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
