'use strict';

/**
 * average — a small numbers helper.
 * @returns the computed result
 */
function average(arr) {
  return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
}

export default average;
