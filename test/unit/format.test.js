import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatCurrencyInput,
  formatDate,
  formatNumber,
  formatPercent,
  formatRate,
  shortenAddress,
} from '../../src/utils/format.js';

describe('formatAmount', () => {
  it('defaults to en-US formatting when no locale is given', () => {
    expect(formatAmount(1234.5, 'USD')).toBe('$1,234.50');
  });

  it('respects an explicit locale for grouping and decimal separators', () => {
    const result = formatAmount(1234.5, 'EUR', 'fr-FR');
    expect(result).toContain('234,50');
    expect(result).toContain('€');
    expect(result).not.toBe(formatAmount(1234.5, 'EUR', 'en-US'));
  });

  it('keeps the currency symbol in front for en-GB', () => {
    expect(formatAmount(1234.5, 'GBP', 'en-GB')).toBe('£1,234.50');
  });

  it('falls back to 0 for a non-numeric amount', () => {
    expect(formatAmount('not-a-number', 'USD')).toBe('$0.00');
  });

  it('handles numeric string inputs correctly', () => {
    expect(formatAmount('100.5', 'USD')).toBe('$100.50');
  });

  it('defaults the locale argument itself when omitted, independent of the currency', () => {
    expect(formatAmount(10, 'NGN')).toBe(
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(10),
    );
  });
});

describe('formatDate', () => {
  const value = '2026-07-15T10:30:00Z';

  it('defaults to en-US formatting when no locale is given', () => {
    expect(formatDate(value)).toBe('Jul 15, 2026');
  });

  it('respects an explicit locale', () => {
    expect(formatDate(value, 'fr-FR')).toBe('15 juil. 2026');
  });

  it('returns a placeholder for a missing value regardless of locale', () => {
    expect(formatDate(null, 'fr-FR')).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('')).toBe('-');
  });

  it('handles Date objects and numeric timestamps', () => {
    const dateObj = new Date(value);
    expect(formatDate(dateObj)).toBe('Jul 15, 2026');
    expect(formatDate(dateObj.getTime())).toBe('Jul 15, 2026');
  });
});

describe('formatRate', () => {
  it('formats exchange rate as a "1 FROM = X TO" string with 4 decimals', () => {
    expect(formatRate(294.62, 'USD', 'NGN')).toBe('1 USD = 294.6200 NGN');
    expect(formatRate(0.0034, 'NGN', 'USD')).toBe('1 NGN = 0.0034 USD');
  });

  it('returns a placeholder when rate is null or undefined', () => {
    expect(formatRate(null, 'USD', 'NGN')).toBe('-');
    expect(formatRate(undefined, 'USD', 'NGN')).toBe('-');
  });
});

describe('formatCurrencyInput', () => {
  it('returns empty string for null, undefined, or empty values', () => {
    expect(formatCurrencyInput(null)).toBe('');
    expect(formatCurrencyInput(undefined)).toBe('');
    expect(formatCurrencyInput('')).toBe('');
    expect(formatCurrencyInput('.')).toBe('');
  });

  it('strips non-numeric characters and formats to two decimal places', () => {
    expect(formatCurrencyInput('1,234.5')).toBe('1234.50');
    expect(formatCurrencyInput('$100.5')).toBe('100.50');
    expect(formatCurrencyInput('abc12.3xyz')).toBe('12.30');
  });

  it('handles clean number inputs', () => {
    expect(formatCurrencyInput(15)).toBe('15.00');
    expect(formatCurrencyInput('25.5')).toBe('25.50');
  });

  it('returns empty string for non-numeric input strings', () => {
    expect(formatCurrencyInput('abc')).toBe('');
  });
});

describe('formatPercent', () => {
  it('formats fractional ratio as percentage string with 2 decimal places default', () => {
    expect(formatPercent(0.005)).toBe('0.50%');
    expect(formatPercent(0.15)).toBe('15.00%');
  });

  it('supports custom decimal places', () => {
    expect(formatPercent(0.005, 1)).toBe('0.5%');
    expect(formatPercent(0.12345, 3)).toBe('12.345%');
  });

  it('falls back to 0 for non-numeric or missing input', () => {
    expect(formatPercent('not-a-number')).toBe('0.00%');
    expect(formatPercent(null)).toBe('0.00%');
  });
});

describe('formatNumber', () => {
  it('defaults to en-US grouping when no locale is given', () => {
    expect(formatNumber(1234.5)).toBe('1,234.5');
  });

  it('respects an explicit locale for grouping and decimal separators', () => {
    const result = formatNumber(1234.5, 2, 'fr-FR');
    expect(result).toContain('234,5');
    expect(result).not.toBe(formatNumber(1234.5, 2, 'en-US'));
  });

  it('falls back to 0 for non-numeric inputs', () => {
    expect(formatNumber('invalid')).toBe('0');
  });
});

describe('shortenAddress', () => {
  const address = 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF';

  it('shortens long address with default head (6) and tail (4)', () => {
    expect(shortenAddress(address)).toBe('GBQAZ7...CDEF');
  });

  it('allows custom head and tail lengths', () => {
    expect(shortenAddress(address, 4, 3)).toBe('GBQA...DEF');
  });

  it('returns original value when string length is less than or equal to head + tail', () => {
    expect(shortenAddress('SHORT')).toBe('SHORT');
    expect(shortenAddress('1234567890')).toBe('1234567890');
  });

  it('returns "-" placeholder for empty, null, or undefined values', () => {
    expect(shortenAddress('')).toBe('-');
    expect(shortenAddress(null)).toBe('-');
    expect(shortenAddress(undefined)).toBe('-');
  });
});
