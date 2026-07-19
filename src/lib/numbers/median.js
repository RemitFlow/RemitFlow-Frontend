'use strict';

/**
 * median — a small numbers helper.
 * @returns the computed result
 */
function median(arr) {
  const s = [...arr].sort((p, q) => p - q); const m = Math.floor(s.length / 2); return s.length === 0 ? 0 : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default median;
