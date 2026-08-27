// Exact money handling for RemitFlow.
//
// Two problems this module exists to solve:
//
//  1. Silent numeric coercion. `Number(x)` maps `null`, `''`, `[]` and `false`
//     to 0 and anything else to NaN, which the old `Number(x) || 0` idiom then
//     also turned into 0. A transfer whose amount failed to parse rendered as
//     "$0.00" — a plausible-looking number that misrepresents the outcome.
//     `parseDecimal` refuses to guess: it either returns a value or an error.
//
//  2. Binary floating point. 0.1 + 0.2 !== 0.3, and an FX rate multiplication
//     chained through floats accumulates error that eventually shows up as an
//     off-by-one-cent receipt. Every amount here is carried as a decimal
//     *string* and every arithmetic step runs on BigInt minor units, so the
//     numbers on a receipt are exactly the numbers that were quoted.
//
// Money crosses the API boundary as a decimal string and stays a decimal
// string until it is formatted. It is never a float in between.

import { DEFAULT_LOCALE } from '../constants/locales.js';

// Placeholder rendered instead of a fabricated "0.00" when a value cannot be
// parsed. Showing nothing is safer than showing the wrong number.
export const MONEY_PLACEHOLDER = '—';

// Working precision for exchange rates. Twelve decimal places is far beyond
// any published FX quote and keeps cross-rate division loss below a millionth
// of a minor unit for the corridors RemitFlow supports.
export const RATE_SCALE = 12;

// ISO 4217 currencies whose minor unit is not 1/100.
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'UYI',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD',
  'IQD',
  'JOD',
  'KWD',
  'LYD',
  'OMR',
  'TND',
]);

// A decimal literal, optionally signed, optionally in exponent notation.
// Deliberately stricter than Number(): no whitespace-only strings, no
// hex/octal/binary literals, no "Infinity", no numeric separators.
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Number of decimal places in a currency's minor unit.
 * @param {string} code - ISO 4217 currency code
 * @returns {number} 0, 2 or 3
 */
export function currencyExponent(code) {
  if (typeof code !== 'string') return 2;
  const upper = code.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(upper)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(upper)) return 3;
  return 2;
}

/**
 * Rewrite exponent notation as a plain decimal literal ("1e3" -> "1000").
 * @param {string} input
 * @returns {string}
 */
function expandExponent(input) {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?[eE]([+-]?\d+)$/.exec(input);
  if (!match) return input;

  const sign = match[1];
  const intPart = match[2] || '';
  const fracPart = match[3] || '';
  const exponent = Number.parseInt(match[4], 10);
  const digits = intPart + fracPart;
  const pointIndex = intPart.length + exponent;

  if (pointIndex <= 0) {
    return `${sign}0.${'0'.repeat(-pointIndex)}${digits}`;
  }
  if (pointIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(pointIndex - digits.length)}`;
  }
  return `${sign}${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`;
}

/**
 * Reduce a decimal literal to one canonical spelling so that equal values
 * compare equal as strings: no leading "+", no redundant zeros, no "-0".
 * @param {string} input - a plain (non-exponent) decimal literal
 * @returns {string}
 */
function canonicalize(input) {
  let rest = input;
  let sign = '';
  if (rest.startsWith('+')) rest = rest.slice(1);
  else if (rest.startsWith('-')) {
    sign = '-';
    rest = rest.slice(1);
  }

  const dot = rest.indexOf('.');
  let intPart = dot === -1 ? rest : rest.slice(0, dot);
  let fracPart = dot === -1 ? '' : rest.slice(dot + 1);

  intPart = intPart.replace(/^0+(?=\d)/, '');
  if (intPart === '') intPart = '0';
  fracPart = fracPart.replace(/0+$/, '');

  const magnitude = fracPart ? `${intPart}.${fracPart}` : intPart;
  return magnitude === '0' ? '0' : `${sign}${magnitude}`;
}

/**
 * Describe a rejected value well enough to debug it from a log line.
 * @param {unknown} value
 * @returns {string}
 */
export function describeValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `array(${value.length})`;
  const type = typeof value;
  if (type === 'string') return `string ${JSON.stringify(value)}`;
  if (type === 'number' || type === 'boolean' || type === 'bigint') {
    return `${type} ${String(value)}`;
  }
  if (type === 'object') {
    const keys = Object.keys(value).slice(0, 4).join(', ');
    return `object {${keys}}`;
  }
  return type;
}

/**
 * Parse a value into a canonical decimal string without ever guessing.
 *
 * Unlike Number(), this rejects null, undefined, booleans, empty strings,
 * arrays, objects, NaN and Infinity rather than coercing them to 0 or NaN.
 *
 * @param {unknown} value - a number or a numeric string
 * @returns {{ok: true, value: string} | {ok: false, error: string}}
 */
export function parseDecimal(value) {
  if (typeof value === 'bigint') {
    return { ok: true, value: canonicalize(value.toString()) };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return {
        ok: false,
        error: `expected a finite number, received ${describeValue(value)}`,
      };
    }
    return { ok: true, value: canonicalize(expandExponent(String(value))) };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return { ok: false, error: 'expected a decimal string, received ""' };
    }
    if (!DECIMAL_PATTERN.test(trimmed)) {
      return {
        ok: false,
        error: `expected a decimal string, received ${describeValue(value)}`,
      };
    }
    return { ok: true, value: canonicalize(expandExponent(trimmed)) };
  }

  return {
    ok: false,
    error: `expected a number or decimal string, received ${describeValue(value)}`,
  };
}

/**
 * Parse a decimal, or throw. Use at trust boundaries that have already been
 * validated; prefer parseDecimal() where a caller can recover.
 * @param {unknown} value
 * @param {string} [label] - included in the thrown message
 * @returns {string} canonical decimal string
 */
export function requireDecimal(value, label = 'value') {
  const parsed = parseDecimal(value);
  if (!parsed.ok) throw new TypeError(`${label}: ${parsed.error}`);
  return parsed.value;
}

function pow10(exponent) {
  return 10n ** BigInt(exponent);
}

/**
 * Divide two BigInts, rounding halves away from zero (ROUND_HALF_UP).
 * @param {bigint} numerator
 * @param {bigint} denominator
 * @returns {bigint}
 */
function divideHalfUp(numerator, denominator) {
  const negative = numerator < 0n !== denominator < 0n;
  const absNumerator = numerator < 0n ? -numerator : numerator;
  const absDenominator = denominator < 0n ? -denominator : denominator;
  const quotient = absNumerator / absDenominator;
  const remainder = absNumerator % absDenominator;
  const rounded = remainder * 2n >= absDenominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

/**
 * Convert a decimal string into integer minor units (cents, kobo, ...).
 * Extra precision is rounded half-up away from zero.
 * @param {string|number} decimal - a value accepted by parseDecimal
 * @param {number} exponent - decimal places in the minor unit
 * @returns {bigint}
 */
export function toMinorUnits(decimal, exponent) {
  const canonical = requireDecimal(decimal, 'amount');
  const negative = canonical.startsWith('-');
  const magnitude = negative ? canonical.slice(1) : canonical;

  const dot = magnitude.indexOf('.');
  const intPart = dot === -1 ? magnitude : magnitude.slice(0, dot);
  const fracPart = dot === -1 ? '' : magnitude.slice(dot + 1);

  let digits;
  let roundUp = false;
  if (fracPart.length <= exponent) {
    digits = intPart + fracPart.padEnd(exponent, '0');
  } else {
    digits = intPart + fracPart.slice(0, exponent);
    // '5' is char code 53; anything at or above it rounds the magnitude up.
    roundUp = fracPart.charCodeAt(exponent) >= 53;
  }

  let units = BigInt(digits === '' ? '0' : digits);
  if (roundUp) units += 1n;
  return negative ? -units : units;
}

/**
 * Render integer minor units as a fixed-scale decimal string ("20000" at
 * exponent 2 becomes "200.00"). Trailing zeros are kept: the scale carries
 * information about the currency.
 * @param {bigint} units
 * @param {number} exponent
 * @returns {string}
 */
export function fromMinorUnits(units, exponent) {
  const negative = units < 0n;
  const digits = (negative ? -units : units)
    .toString()
    .padStart(exponent + 1, '0');
  const magnitude =
    exponent === 0
      ? digits
      : `${digits.slice(0, -exponent)}.${digits.slice(-exponent)}`;
  return negative ? `-${magnitude}` : magnitude;
}

/**
 * Multiply minor units by a decimal factor, rounding half-up to whole units.
 * Used for percentage fees, where the factor is not a currency amount.
 * @param {bigint} units
 * @param {string|number} factor - e.g. "0.005" for a 0.5% fee
 * @returns {bigint}
 */
export function scaleMinorUnits(units, factor) {
  const scaledFactor = toMinorUnits(
    requireDecimal(factor, 'factor'),
    RATE_SCALE,
  );
  return divideHalfUp(units * scaledFactor, pow10(RATE_SCALE));
}

/**
 * Apply an exchange rate to minor units, crossing between currencies whose
 * minor units may have different precision.
 * @param {bigint} units - amount in the source currency's minor units
 * @param {string|number} rate - units of `to` per 1 unit of `from`
 * @param {number} fromExponent
 * @param {number} toExponent
 * @returns {bigint} amount in the destination currency's minor units
 */
export function convertMinorUnits(units, rate, fromExponent, toExponent) {
  const scaledRate = toMinorUnits(requireDecimal(rate, 'rate'), RATE_SCALE);
  const exponentDelta = toExponent - fromExponent;
  const numerator = units * scaledRate * pow10(Math.max(exponentDelta, 0));
  const denominator = pow10(RATE_SCALE + Math.max(-exponentDelta, 0));
  return divideHalfUp(numerator, denominator);
}

/**
 * Divide two decimal strings to `RATE_SCALE` places. Used to derive a cross
 * rate from two USD-quoted rates without a float round trip.
 * @param {string|number} numerator
 * @param {string|number} denominator
 * @returns {string|null} canonical decimal string, or null if dividing by zero
 */
export function divideDecimal(numerator, denominator) {
  const top = toMinorUnits(requireDecimal(numerator, 'numerator'), RATE_SCALE);
  const bottom = toMinorUnits(
    requireDecimal(denominator, 'denominator'),
    RATE_SCALE,
  );
  if (bottom === 0n) return null;
  return canonicalize(
    fromMinorUnits(divideHalfUp(top * pow10(RATE_SCALE), bottom), RATE_SCALE),
  );
}

/**
 * Round a decimal to a currency's minor unit and return it as a fixed-scale
 * decimal string. This is the value that should be stored and displayed.
 * @param {string|number} decimal
 * @param {string} currency
 * @returns {string}
 */
export function quantize(decimal, currency) {
  const exponent = currencyExponent(currency);
  return fromMinorUnits(toMinorUnits(decimal, exponent), exponent);
}

/**
 * Number of digits after the decimal point in a canonical decimal string.
 * @param {string} canonical
 * @returns {number}
 */
function fractionDigits(canonical) {
  const dot = canonical.indexOf('.');
  return dot === -1 ? 0 : canonical.length - dot - 1;
}

/**
 * Compare two decimal values exactly, at whatever precision they carry.
 * Comparing at a fixed scale would quietly call 0.30000000000000004 equal to
 * 0.3, which is the class of bug this module exists to remove.
 * @param {string|number} a
 * @param {string|number} b
 * @returns {number} -1, 0 or 1
 */
export function compareDecimal(a, b) {
  const canonicalA = requireDecimal(a, 'a');
  const canonicalB = requireDecimal(b, 'b');
  const scale = Math.max(
    fractionDigits(canonicalA),
    fractionDigits(canonicalB),
  );
  const left = toMinorUnits(canonicalA, scale);
  const right = toMinorUnits(canonicalB, scale);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Format a money value for display, using the currency's real minor-unit
 * precision (¥1,235 rather than ¥1,234.50).
 *
 * Unparseable input renders as MONEY_PLACEHOLDER rather than a fabricated
 * zero — see the note at the top of this file.
 *
 * @param {unknown} value - decimal string or number
 * @param {string} [currency] - ISO 4217 code
 * @param {string} [locale] - BCP 47 locale tag
 * @param {{fallback?: string}} [options]
 * @returns {string}
 */
export function formatMoney(
  value,
  currency = 'USD',
  locale = DEFAULT_LOCALE,
  options = {},
) {
  const fallback = options.fallback ?? MONEY_PLACEHOLDER;
  const parsed = parseDecimal(value);
  if (!parsed.ok) return fallback;

  const exponent = currencyExponent(currency);
  const quantized = fromMinorUnits(
    toMinorUnits(parsed.value, exponent),
    exponent,
  );

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
      // Intl accepts a decimal string and formats it without a float round
      // trip, which matters for large minor-unit amounts (NGN, VND).
    }).format(quantized);
  } catch {
    return fallback;
  }
}
