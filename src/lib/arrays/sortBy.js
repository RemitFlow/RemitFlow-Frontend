'use strict';

/**
 * sortBy — a small arrays helper.
 * @returns the computed result
 */
function sortBy(arr, fn) {
  return [...arr].sort((p, q) => fn(p) - fn(q));
}

export default sortBy;
