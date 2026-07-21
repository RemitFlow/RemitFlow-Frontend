const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Preset options for the Transfers date-range filter. */
export const DATE_RANGE_PRESETS = [
  { value: '', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

/**
 * Parse a preset token such as "7d" into a day count.
 * @param {string} range
 * @returns {number|null}
 */
export function getDateRangeDays(range) {
  const match = range?.match(/^(\d+)d$/);
  return match ? Number(match[1]) : null;
}

/**
 * Whether a transfer timestamp falls inside the selected preset window.
 * @param {string|number|Date} createdAt
 * @param {string} range - preset token, e.g. "7d"; empty means all time
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isWithinDateRange(createdAt, range, now = new Date()) {
  const days = getDateRangeDays(range);
  if (!days) return true;

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;

  const cutoff = new Date(now.getTime() - days * MS_PER_DAY);
  return created >= cutoff;
}
