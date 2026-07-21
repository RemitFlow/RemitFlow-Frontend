import { describe, expect, it } from 'vitest'
import {
  DATE_RANGE_PRESETS,
  getDateRangeDays,
  isWithinDateRange
} from '../../src/utils/dateRange.js'

describe('dateRange utils', () => {
  const now = new Date('2026-06-05T12:00:00Z')

  it('exposes preset menu options', () => {
    expect(DATE_RANGE_PRESETS.map((preset) => preset.label)).toEqual([
      'All time',
      'Last 7 days',
      'Last 30 days',
      'Last 90 days'
    ])
  })

  it('parses day-based preset tokens', () => {
    expect(getDateRangeDays('7d')).toBe(7)
    expect(getDateRangeDays('')).toBeNull()
    expect(getDateRangeDays('all')).toBeNull()
  })

  it('allows all transfers when no preset is selected', () => {
    expect(isWithinDateRange('2026-01-01T00:00:00Z', '', now)).toBe(true)
  })

  it('includes transfers inside the selected window', () => {
    expect(isWithinDateRange('2026-06-02T08:42:00Z', '7d', now)).toBe(true)
  })

  it('excludes transfers outside the selected window', () => {
    expect(isWithinDateRange('2026-05-28T10:15:00Z', '7d', now)).toBe(false)
  })
})
