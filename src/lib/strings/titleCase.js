'use strict';

/**
 * titleCase — a small strings helper.
 * @returns the computed result
 */
function titleCase(s) {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

export default titleCase;
