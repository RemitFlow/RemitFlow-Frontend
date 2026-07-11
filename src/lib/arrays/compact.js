'use strict';

/**
 * compact — a small arrays helper.
 * @returns the computed result
 */
function compact(arr) {
  return arr.filter(Boolean);
}

module.exports = compact;
