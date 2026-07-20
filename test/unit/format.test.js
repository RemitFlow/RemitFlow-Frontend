import { describe, expect, it } from 'vitest'
import { formatAmount, formatDate, formatNumber } from '../../src/utils/format.js'

describe('formatAmount', () => {
  it('defaults to en-US formatting when no locale is given', () => {
    expect(formatAmount(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('respects an explicit locale for grouping and decimal separators', () => {
    // French formatting uses a comma as the decimal separator, unlike en-US.
    const result = formatAmount(1234.5, 'EUR', 'fr-FR')
    expect(result).toContain('234,50')
    expect(result).toContain('€')
    expect(result).not.toBe(formatAmount(1234.5, 'EUR', 'en-US'))
  })

  it('keeps the currency symbol in front for en-GB', () => {
    expect(formatAmount(1234.5, 'GBP', 'en-GB')).toBe('£1,234.50')
  })

  it('falls back to 0 for a non-numeric amount', () => {
    expect(formatAmount('not-a-number', 'USD')).toBe('$0.00')
  })

  it('defaults the locale argument itself when omitted, independent of the currency', () => {
    expect(formatAmount(10, 'NGN')).toBe(new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(10))
  })
})

describe('formatDate', () => {
  const value = '2026-07-15T10:30:00Z'

  it('defaults to en-US formatting when no locale is given', () => {
    expect(formatDate(value)).toBe('Jul 15, 2026')
  })

  it('respects an explicit locale', () => {
    expect(formatDate(value, 'fr-FR')).toBe('15 juil. 2026')
  })

  it('returns a placeholder for a missing value regardless of locale', () => {
    expect(formatDate(null, 'fr-FR')).toBe('-')
  })
})

describe('formatNumber', () => {
  it('defaults to en-US grouping when no locale is given', () => {
    expect(formatNumber(1234.5)).toBe('1,234.5')
  })

  it('respects an explicit locale for grouping and decimal separators', () => {
    const result = formatNumber(1234.5, 2, 'fr-FR')
    expect(result).toContain('234,5')
    expect(result).not.toBe(formatNumber(1234.5, 2, 'en-US'))
  })
})
