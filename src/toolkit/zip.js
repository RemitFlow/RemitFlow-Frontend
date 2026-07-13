/**
 * Zip two arrays into pairs.
 */
export const zip = (a, b) => a.map((v, i) => [v, b[i]]);
