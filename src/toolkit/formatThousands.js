/**
 * Insert thousands separators.
 */
export const formatThousands = (n) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
