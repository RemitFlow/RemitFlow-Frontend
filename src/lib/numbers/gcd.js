'use strict';

/**
 * gcd — a small numbers helper.
 * @returns the computed result
 */
function gcd(a, b) {
  let x = Math.abs(a), y = Math.abs(b); while (y) { const t = x % y; x = y; y = t; } return x;
}

export default gcd;
