// Supported currencies for RemitFlow transfers.
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' }
]

export const DEFAULT_SOURCE = 'USD'
export const DEFAULT_DEST = 'NGN'

// Popular remittance corridors highlighted on the landing page.
export const POPULAR_CORRIDORS = [
  { from: 'USD', to: 'NGN' },
  { from: 'USD', to: 'INR' },
  { from: 'USD', to: 'PHP' },
  { from: 'EUR', to: 'NGN' },
  { from: 'GBP', to: 'INR' },
  { from: 'USD', to: 'MXN' }
]

/**
 * Look up the metadata for a currency by its code.
 * @param {string} code - ISO currency code, e.g. "USD"
 * @returns {{code: string, name: string, symbol: string, flag: string}|undefined}
 */
export function getCurrency(code) {
  return CURRENCIES.find((c) => c.code === code)
}
