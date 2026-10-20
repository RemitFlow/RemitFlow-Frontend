// Supported currencies for RemitFlow transfers.
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', minorUnits: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', minorUnits: 2 },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    minorUnits: 2,
  },
  {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    flag: '🇳🇬',
    minorUnits: 2,
  },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', minorUnits: 2 },
  {
    code: 'PHP',
    name: 'Philippine Peso',
    symbol: '₱',
    flag: '🇵🇭',
    minorUnits: 2,
  },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', minorUnits: 2 },
];

export const DEFAULT_SOURCE = 'USD';
export const DEFAULT_DEST = 'NGN';

// Flat list of supported ISO currency codes, derived from CURRENCIES.
// Used for currency-matrix validation in the send flow.
export const SUPPORTED_CURRENCY_CODES = CURRENCIES.map((c) => c.code);

// Popular remittance corridors highlighted on the landing page.
export const POPULAR_CORRIDORS = [
  { from: 'USD', to: 'NGN' },
  { from: 'USD', to: 'INR' },
  { from: 'USD', to: 'PHP' },
  { from: 'EUR', to: 'NGN' },
  { from: 'GBP', to: 'INR' },
  { from: 'USD', to: 'MXN' },
];

/**
 * Look up the metadata for a currency by its code.
 * @param {string} code - ISO currency code, e.g. "USD"
 * @returns {{code: string, name: string, symbol: string, flag: string}|undefined}
 */
export function getCurrency(code) {
  return CURRENCIES.find((c) => c.code === code);
}

export function getCurrencyMinorUnits(code) {
  return getCurrency(code)?.minorUnits ?? 2;
}

/**
 * Return display metadata for a currency, suitable for rendering in the
 * quote card and amount entry fields.
 * @param {string} code - ISO currency code, e.g. "USD"
 * @returns {{code: string, name: string, symbol: string, minorUnits: number}|undefined}
 */
export function getCurrencyMetadata(code) {
  const currency = getCurrency(code);
  if (!currency) return undefined;
  return {
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    minorUnits: currency.minorUnits,
  };
}