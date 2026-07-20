import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TransferRow from '../components/TransferRow.jsx'
import Skeleton from '../components/Skeleton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Button from '../components/Button.jsx'
import { useTransfers } from '../hooks/useTransfers.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
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
  useDocumentTitle('Your Transfers')

  const { transfers, loading, error, reload } = useTransfers()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (status && t.status !== status) return false
      if (search && !t.recipient.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transfers, search, status])

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

  const hasActiveFilters = search || status

  return (
    <div className="transfers">
      <div className="transfers-header">
        <h1 className="page-title">Your Transfers</h1>
        <Link to="/send">
          <Button>New Transfer</Button>
        </Link>
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
      </div>

      {loading && (
        <div className="transfers-list">
          <Skeleton count={3} height="4.5rem" />
        </div>
      )}

      {!loading && error && <ErrorMessage message={error} onRetry={reload} />}

      {!loading && !error && filteredTransfers.length === 0 && (
        <EmptyState
          icon="🔍"
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
              <Link to="/send">
                <Button>Send your first transfer</Button>
              </Link>
            )
          }
        />
      )}

      {!loading && !error && filteredTransfers.length > 0 && (
        <div className="transfers-list">
          {filteredTransfers.map((t) => (
            <TransferRow key={t.id} transfer={t} />
          ))}
        </div>
      )}
    </div>
  )
}
