'use strict';

/**
 * chunk — a small arrays helper.
 * @returns the computed result
 */
function chunk(arr, n) {
  const out = []; for (let i = 0; i < arr.length; i += n) { out.push(arr.slice(i, i + n)); } return out;
}

export default chunk;
