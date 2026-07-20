/**
 * Truncate a string to len characters.
 */
export const truncate = (s, len, suffix = '...') =>
  s.length > len ? s.slice(0, len) + suffix : s;
