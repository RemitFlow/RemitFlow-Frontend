// Formatting helpers for currency, dates and addresses.
import { getCurrencyMinorUnits } from '../constants/currencies.js';
import { DEFAULT_LOCALE } from '../constants/locales.js';
import { parseDecimal, quantize } from './money.js';

const DIGIT_MAP = new Map();
for (const numberingSystem of ['latn', 'arab', 'arabext', 'deva']) {
  const formatter = new Intl.NumberFormat(`en-US-u-nu-${numberingSystem}`, {
    useGrouping: false,
  });
  for (let digit = 0; digit <= 9; digit += 1) {
    DIGIT_MAP.set(formatter.format(digit), String(digit));
  }
}

const DECIMAL_CACHE = new Map();

function getLocaleSeparators(locale) {
  if (!DECIMAL_CACHE.has(locale)) {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    DECIMAL_CACHE.set(locale, {
      decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
      group: parts.find((part) => part.type === 'group')?.value ?? ',',
    });
  }
  return DECIMAL_CACHE.get(locale);
}

function normaliseDigits(value) {
  return Array.from(String(value), (char) => DIGIT_MAP.get(char) ?? char).join(
    '',
  );
}

/**
 * Return the canonical decimal-string precision for a currency.
 * @param {string} currency - ISO currency code
 * @returns {number} number of minor-unit decimal places
 */
export function getCurrencyPrecision(currency = 'USD') {
  return getCurrencyMinorUnits(currency);
}

/**
 * Parse a user-entered amount into a canonical decimal string.
 * Locale grouping is removed, locale decimals are converted to '.', precision
 * beyond the currency minor unit is rejected, and negative/zero values can be
 * rejected by the caller through options.
 * @param {string|number} value - raw amount input
 * @param {object} [options]
 * @param {string} [options.currency] - ISO currency code
 * @param {string} [options.locale] - BCP 47 locale tag
 * @param {boolean} [options.allowZero]
 * @param {boolean} [options.allowNegative]
 * @returns {{ok: true, value: string, minorUnits: bigint, precision: number}|{ok: false, error: string}}
 */
export function parseCurrencyInput(value, options = {}) {
  const {
    currency = 'USD',
    locale = DEFAULT_LOCALE,
    allowZero = false,
    allowNegative = false,
  } = options;
  const precision = getCurrencyPrecision(currency);
  const { decimal, group } = getLocaleSeparators(locale);
  let input = normaliseDigits(value ?? '').trim();
  input = input.replace(/[\s\u00a0\u202f]/g, '');
  if (group) input = input.split(group).join('');
  if (decimal !== '.') input = input.split(decimal).join('.');
  if (!input) return { ok: false, error: 'Enter an amount greater than zero.' };
  const negative = input.startsWith('-');
  if (negative) input = input.slice(1);
  if (input.startsWith('+')) input = input.slice(1);
  if (negative && !allowNegative) {
    return { ok: false, error: 'Amount cannot be negative.' };
  }
  if (!/^\d*(\.\d*)?$/.test(input) || input === '.' || input === '') {
    return { ok: false, error: 'Enter a valid amount.' };
  }
  let [whole = '0', fraction = ''] = input.split('.');
  whole = whole.replace(/^0+(?=\d)/, '') || '0';
  if (fraction.length > precision) {
    return {
      ok: false,
      error: `${currency} supports at most ${precision} decimal places.`,
    };
  }
  const paddedFraction = fraction.padEnd(precision, '0');
  const minorUnits = BigInt(whole + paddedFraction || '0');
  if (minorUnits === 0n && !allowZero) {
    return { ok: false, error: 'Enter an amount greater than zero.' };
  }
  const sign = negative ? '-' : '';
  const canonical = `${sign}${whole}.${paddedFraction}`;
  return { ok: true, value: canonical, minorUnits, precision };
}

function decimalStringToNumber(value) {
  if (typeof value === 'bigint') return Number(value);
  const parsed = parseCurrencyInput(value, {
    allowZero: true,
    allowNegative: true,
  });
  return parsed.ok ? Number(parsed.value) : Number(value) || 0;
}

/**
 * Format an amount as a currency string.
 *
 * Low-level helper: it assumes two decimal places and falls back to 0 for a
 * non-numeric amount. For money that arrived from an API use `formatMoney`
 * in utils/money.js instead, which honours the currency's real minor unit and
 * refuses to render an unparseable value as "0.00".
 *
 * @param {number|string} amount - the amount to format
 * @param {string} [currency] - ISO currency code, e.g. "USD"
 * @param {string} [locale] - BCP 47 locale tag used for grouping, decimal
 *   separator and symbol placement, e.g. "en-US" or "fr-FR"
 * @returns {string} the formatted currency string
 */
export function formatAmount(
  amount,
  currency = 'USD',
  locale = DEFAULT_LOCALE,
) {
  const precision = getCurrencyPrecision(currency);
  const num = decimalStringToNumber(amount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(num);
}

/**
 * Format a date for display.
 * @param {string|number|Date} value - the date to format
 * @param {string} [locale] - BCP 47 locale tag
 * @returns {string} the formatted date, or "-" when value is missing
 */
export function formatDate(value, locale = DEFAULT_LOCALE) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format an exchange rate as a "1 FROM = X TO" string.
 * Accepts the decimal strings that the FX and quote services now produce as
 * well as plain numbers; anything unparseable renders as "-".
 * @param {number|string} rate
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
export function formatRate(rate, from, to) {
  const parsed = parseDecimal(rate);
  if (!parsed.ok) return '-';
  return `1 ${from} = ${Number(parsed.value).toFixed(4)} ${to}`;
}

/**
 * Normalise a raw amount string into a clean, fixed-precision value for the
 * amount field (e.g. "1,234.5" -> "1234.50").
 *
 * The value is parsed first and only stripped of grouping characters as a
 * fallback. Stripping first corrupts perfectly valid input: `<input
 * type="number">` accepts "1e3", and the old strip-then-parse implementation
 * turned that into "13.00" — a 1000x under-send with no error anywhere. A
 * leading minus is likewise preserved so a negative amount reaches validation
 * as negative instead of being silently flipped positive.
 *
 * @param {string|number} value - the raw input value
 * @param {string} [currency] - used for minor-unit precision
 * @returns {string} the cleaned amount, or '' if the input is not a number
 */
export function formatCurrencyInput(
  value,
  currency = 'USD',
  locale = DEFAULT_LOCALE,
) {
  if (value == null) return '';

  let parsed = parseCurrencyInput(value, {
    currency,
    locale,
    allowZero: true,
  });
  if (parsed.ok) return parsed.value;

  let decimal = parseDecimal(value);
  if (!decimal.ok) {
    // Fall back to stripping display formatting (grouping separators,
    // currency symbols, whitespace) while keeping sign and decimal point.
    const stripped = String(value).replace(/[^0-9.eE+-]/g, '');
    decimal = parseDecimal(stripped);
  }
  if (!decimal.ok) return '';

  return quantize(decimal.value, currency);
}

/**
 * Format a fractional ratio as a percentage string (0.005 -> "0.5%").
 * @param {number} value - the ratio to format
 * @param {number} [decimals] - decimal places to keep
 * @returns {string} the formatted percentage
 */
export function formatPercent(value, decimals = 2) {
  const num = Number(value) || 0;
  return `${(num * 100).toFixed(decimals)}%`;
}

/**
 * Format a plain number with grouped thousands and no currency symbol.
 * @param {number} value - the number to format
 * @param {number} [decimals] - maximum decimal places to show
 * @param {string} [locale] - BCP 47 locale tag
 * @returns {string} the formatted number
 */
export function formatNumber(value, decimals = 2, locale = DEFAULT_LOCALE) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Shorten a long string (e.g. a Stellar public key) for display.
 * @param {string} value - the value to shorten
 * @param {number} [head] - characters to keep at the start
 * @param {number} [tail] - characters to keep at the end
 * @returns {string} the shortened value, or the original if already short
 */
export function shortenAddress(value, head = 6, tail = 4) {
  if (!value || value.length <= head + tail) return value || '-';
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}
