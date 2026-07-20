// Supported locales for currency, number and date formatting.
export const LOCALES = [
  { code: 'en-US', name: 'English (United States)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'es-MX', name: 'Español (México)' },
  { code: 'fr-FR', name: 'Français (France)' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'hi-IN', name: 'हिन्दी (भारत)' },
  { code: 'ar-EG', name: 'العربية (مصر)' }
]

export const DEFAULT_LOCALE = 'en-US'

/**
 * Check whether a locale code is one RemitFlow offers in its locale picker.
 * @param {string} code - locale code, e.g. "en-US"
 * @returns {boolean}
 */
export function isSupportedLocale(code) {
  return LOCALES.some((l) => l.code === code)
}
