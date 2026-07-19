'use strict';

/**
 * pick — a small objects helper.
 * @returns the computed result
 */
function pick(obj, keys) {
  return keys.reduce((o, k) => { if (k in obj) o[k] = obj[k]; return o; }, {});
}

export default pick;
