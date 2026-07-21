// Fee configuration for RemitFlow transfers.
// RemitFlow charges a small percentage fee plus a flat network fee.
// These would normally be returned by the backend / Stellar fee stats.

// Percentage fee taken on the send amount (0.5%).
export const FEE_PERCENT = 0.005;

// Flat fee in the source currency to cover the Stellar network cost.
export const FLAT_FEE = 0.1;

// Minimum total fee charged on any transfer.
export const MIN_FEE = 0.25;
