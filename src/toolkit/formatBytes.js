/**
 * Human-readable byte size.
 */
export const formatBytes = (n) =>
  n < 1024
    ? n + ' B'
    : n < 1048576
      ? (n / 1024).toFixed(1) + ' KB'
      : (n / 1048576).toFixed(1) + ' MB';
