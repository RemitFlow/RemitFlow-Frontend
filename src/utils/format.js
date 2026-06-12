// Formatting helpers for currency, dates and addresses.

export function formatAmount(amount, currency = 'USD') {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

export function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
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
