/**
 * Numeric range [start, end).
 */
export const range = (start, end, step = 1) => Array.from({ length: Math.max(0, Math.ceil((end - start) / step)) }, (_, i) => start + i * step);
