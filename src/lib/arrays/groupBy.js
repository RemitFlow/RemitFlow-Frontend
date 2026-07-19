'use strict';

/**
 * groupBy — a small arrays helper.
 * @returns the computed result
 */
function groupBy(arr, fn) {
  return arr.reduce((acc, x) => { const k = fn(x); (acc[k] = acc[k] || []).push(x); return acc; }, {});
}

export default groupBy;
