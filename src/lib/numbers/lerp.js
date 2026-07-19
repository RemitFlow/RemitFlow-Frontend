'use strict';

/**
 * lerp — a small numbers helper.
 * @returns the computed result
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

export default lerp;
