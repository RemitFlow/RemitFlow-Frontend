import { describe, expect, it } from 'vitest'
import { formatAmount, formatDate, formatNumber } from '../../src/utils/format.js'

describe('formatAmount', () => {
  it('formats with the given locale', () => {
    expect(formatAmount(1234.5, 'USD', 'en-US')).toBe('$1,234.50')
    expect(formatAmount(1234.5, 'EUR', 'de-DE')).toBe('1.234,50\u00a0\u20ac')
  })

  it('defaults to en-US', () => {
    expect(formatAmount(100)).toBe('$100.00')
  })
})

describe('formatDate', () => {
  it('formats with the given locale', () => {
    const d = '2024-03-14T12:00:00Z'
    expect(formatDate(d, 'en-US')).toMatch(/Mar/)
    expect(formatDate(d, 'fr-FR')).toMatch(/mars/)
  })

  it('defaults to en-US', () => {
    const d = '2024-03-14T12:00:00Z'
    expect(formatDate(d)).toMatch(/Mar/)
  })
})

describe('formatNumber', () => {
  it('formats with the given locale', () => {
    expect(formatNumber(1234567.89, 2, 'en-US')).toBe('1,234,567.89')
    expect(formatNumber(1234567.89, 2, 'de-DE')).toBe('1.234.567,89')
  })

  it('defaults to en-US', () => {
    expect(formatNumber(1000)).toBe('1,000')
  })
})
