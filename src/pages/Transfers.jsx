import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Chart from '../components/Chart.jsx'
import TransferRow from '../components/TransferRow.jsx'
import Skeleton from '../components/Skeleton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Button from '../components/Button.jsx'
import { useTransfers } from '../hooks/useTransfers.js'
import { useApp } from '../context/AppContext.jsx'
import { DATE_RANGE_PRESETS, isWithinDateRange } from '../utils/dateRange.js'
import './Transfers.css'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' }
]

/**
 * Transfers page: lists all transfers with their status.
 * Filter state is synced to the URL query string.
 */
export default function Transfers() {
  const { transfers, loading, error, reload } = useTransfers()
  const { locale } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const range = searchParams.get('range') || ''

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (status && t.status !== status) return false
      if (search && !t.recipient.toLowerCase().includes(search.toLowerCase())) return false
      if (!isWithinDateRange(t.createdAt, range)) return false
      return true
    })
  }, [transfers, search, status, range])

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value
      setSearchParams((prev) => {
        if (value) prev.set('search', value)
        else prev.delete('search')
        return prev
      })
    },
    [setSearchParams]
  )

  const handleStatusChange = useCallback(
    (e) => {
      const value = e.target.value
      setSearchParams((prev) => {
        if (value) prev.set('status', value)
        else prev.delete('status')
        return prev
      })
    },
    [setSearchParams]
  )

  const handleRangeChange = useCallback(
    (e) => {
      const value = e.target.value
      setSearchParams((prev) => {
        if (value) prev.set('range', value)
        else prev.delete('range')
        return prev
      })
    },
    [setSearchParams]
  )

  const hasActiveFilters = Boolean(search || status || range)

  return (
    <div className="transfers">
      <div className="transfers-header">
        <h1 className="page-title">Your Transfers</h1>
        <Button to="/send">New Transfer</Button>
      </div>

      <div className="transfers-filters">
        <input
          type="search"
          className="transfers-filters-search"
          placeholder="Search by recipient…"
          value={search}
          onChange={handleSearchChange}
          aria-label="Search transfers by recipient"
        />
        <select
          className="transfers-filters-status"
          value={status}
          onChange={handleStatusChange}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="transfers-filters-range"
          value={range}
          onChange={handleRangeChange}
          aria-label="Filter by date range"
        >
          {DATE_RANGE_PRESETS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="transfers-list">
          <Skeleton count={3} height="4.5rem" />
        </div>
      )}

      {!loading && error && <ErrorMessage message={error} onRetry={reload} />}

      {!loading && !error && filteredTransfers.length === 0 && (
        <EmptyState
          icon={hasActiveFilters ? '🔍' : '💸'}
          title={hasActiveFilters ? 'No matching transfers' : 'No transfers yet'}
          message={
            hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Once you send money, your transfers will show up here.'
          }
          action={
            hasActiveFilters ? (
              <Button onClick={() => setSearchParams({})}>Clear filters</Button>
            ) : (
              <Button to="/send">Send your first transfer</Button>
            )
          }
        />
      )}

      {!loading && !error && filteredTransfers.length > 0 && (
        <div className="transfers-list">
          <Chart
            title="Recent Transfer Amounts"
            data={filteredTransfers
              .slice(0, 5)
              .map((t) => ({ value: parseFloat(t.sendAmount) }))}
          />
          {filteredTransfers.map((t) => (
            <TransferRow key={t.id} transfer={t} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}
