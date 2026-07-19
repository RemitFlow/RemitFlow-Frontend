'use strict';

/**
 * initials — a small strings helper.
 * @returns the computed result
 */
function initials(s) {
  return s.split(/\s+/).map((w) => w.charAt(0) || '').join('').toUpperCase();
}

export default initials;
