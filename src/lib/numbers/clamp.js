'use strict';

/**
 * clamp — a small numbers helper.
 * @returns the computed result
 */
function clamp(n, lo, hi) {
  return Math.min(Math.max(n, lo), hi);
}

export default clamp;
