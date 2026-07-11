'use strict';

/**
 * sum — a small numbers helper.
 * @returns the computed result
 */
function sum(arr) {
  return arr.reduce((s, x) => s + x, 0);
}

module.exports = sum;
