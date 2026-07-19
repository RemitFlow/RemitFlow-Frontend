'use strict';

/**
 * percentOf — a small numbers helper.
 * @returns the computed result
 */
function percentOf(part, total) {
  return total === 0 ? 0 : (part / total) * 100;
}

export default percentOf;
