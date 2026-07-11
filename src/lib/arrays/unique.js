'use strict';

/**
 * unique — a small arrays helper.
 * @returns the computed result
 */
function unique(arr) {
  return [...new Set(arr)];
}

module.exports = unique;
