'use strict';

/**
 * roundTo — a small numbers helper.
 * @returns the computed result
 */
function roundTo(n, d) {
  return Math.round(n * 10 ** d) / 10 ** d;
}

export default roundTo;
