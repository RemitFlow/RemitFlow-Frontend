'use strict';

/**
 * slugify — a small strings helper.
 * @returns the computed result
 */
function slugify(s) {
  return s.toLowerCase().trim().split(/[^a-z0-9]+/).filter(Boolean).join('-');
}

export default slugify;
