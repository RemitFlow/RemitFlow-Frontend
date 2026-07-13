/**
 * Pick a subset of object keys.
 */
export const pick = (obj, keys) => keys.reduce((o, k) => (k in obj ? ((o[k] = obj[k]), o) : o), {});
