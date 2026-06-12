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
