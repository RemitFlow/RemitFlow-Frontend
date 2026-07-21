/**
 * Percentage of part relative to whole.
 */
export const percent = (part, whole) =>
  whole === 0 ? 0 : (part / whole) * 100;
