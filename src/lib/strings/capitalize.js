'use strict';

/**
 * capitalize — a small strings helper.
 * @returns the computed result
 */
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default capitalize;
