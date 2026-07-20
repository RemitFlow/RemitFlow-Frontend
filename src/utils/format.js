// Formatting helpers for currency, dates and addresses.
import { DEFAULT_LOCALE } from '../constants/locales.js'

/**
 * Format an amount as a currency string.
 * @param {number|string} amount - the amount to format
 * @param {string} [currency] - ISO currency code, e.g. "USD"
 * @param {string} [locale] - BCP 47 locale tag used for grouping, decimal
 *   separator and symbol placement, e.g. "en-US" or "fr-FR"
 * @returns {string} the formatted currency string
 */
export function formatAmount(amount, currency = 'USD', locale = DEFAULT_LOCALE) {
  const num = Number(amount) || 0
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

/**
 * Format a date for display.
 * @param {string|number|Date} value - the date to format
 * @param {string} [locale] - BCP 47 locale tag
 * @returns {string} the formatted date, or "-" when value is missing
 */
export function formatDate(value, locale = DEFAULT_LOCALE) {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format an exchange rate as a "1 FROM = X TO" string.
 * @param {number} rate
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
export function formatRate(rate, from, to) {
  if (rate == null) return '-'
  return `1 ${from} = ${rate.toFixed(4)} ${to}`
}

/**
 * Normalise a raw amount string into a clean, fixed-precision value.
 * Strips non-numeric characters and clamps to two decimal places so the
 * amount field shows a tidy value (e.g. "1,234.5" -> "1234.50").
 * @param {string} value - the raw input value
 * @returns {string} the cleaned amount, or '' if the input has no digits
 */
export function formatCurrencyInput(value) {
  if (value == null) return ''
  const cleaned = String(value).replace(/[^0-9.]/g, '')
  if (cleaned === '' || cleaned === '.') return ''
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return ''
  return num.toFixed(2)
}

/**
 * Format a fractional ratio as a percentage string (0.005 -> "0.5%").
 * @param {number} value - the ratio to format
 * @param {number} [decimals] - decimal places to keep
 * @returns {string} the formatted percentage
 */
export function formatPercent(value, decimals = 2) {
  const num = Number(value) || 0
  return `${(num * 100).toFixed(decimals)}%`
}

/**
 * Format a plain number with grouped thousands and no currency symbol.
 * @param {number} value - the number to format
 * @param {number} [decimals] - maximum decimal places to show
 * @param {string} [locale] - BCP 47 locale tag
 * @returns {string} the formatted number
 */
export function formatNumber(value, decimals = 2, locale = DEFAULT_LOCALE) {
  const num = Number(value) || 0
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(num)
}

/**
 * Shorten a long string (e.g. a Stellar public key) for display.
 * @param {string} value - the value to shorten
 * @param {number} [head] - characters to keep at the start
 * @param {number} [tail] - characters to keep at the end
 * @returns {string} the shortened value, or the original if already short
 */
export function shortenAddress(value, head = 6, tail = 4) {
  if (!value || value.length <= head + tail) return value || '-'
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}
