'use strict';

/**
 * countWords — a small strings helper.
 * @returns the computed result
 */
function countWords(s) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

export default countWords;
