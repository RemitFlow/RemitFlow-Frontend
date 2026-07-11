'use strict';

/**
 * truncate — a small strings helper.
 * @returns the computed result
 */
function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

module.exports = truncate;
