'use strict';

/**
 * safeDivide — a small numbers helper.
 * @returns the computed result
 */
function safeDivide(a, b) {
  return b === 0 ? 0 : a / b;
}

export default safeDivide;
