'use strict';

/**
 * isBlank — a small strings helper.
 * @returns the computed result
 */
function isBlank(s) {
  return s == null || String(s).trim() === '';
}

export default isBlank;
