/**
 * True if a value is empty.
 */
export const isEmpty = (v) =>
  v == null ||
  (typeof v === 'object'
    ? Object.keys(v).length === 0
    : String(v).length === 0);
