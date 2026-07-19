import { Link } from 'react-router-dom'
import { useState } from 'react'
import TransferRow from '../components/TransferRow.jsx'
import Skeleton from '../components/Skeleton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Button from '../components/Button.jsx'
import { useTransfers } from '../hooks/useTransfers.js'
import './Transfers.css'

/**
 * Transfers page: lists all transfers with their status.
 */
export default function Transfers() {
  const { transfers, loading, error, reload } = useTransfers()
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  const toggle = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const clear = () => setSelectedIds(new Set())

  const exportSelected = () => {
    const selected = transfers.filter((t) => selectedIds.has(t.id))
    const blob = new Blob([JSON.stringify(selected, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'selected-transfers.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="transfers">
      <div className="transfers-header">
        <h1 className="page-title">Your Transfers</h1>
        <Link to="/send">
          <Button>New Transfer</Button>
        </Link>
      </div>

      {loading && (
        <div className="transfers-list">
          <Skeleton count={3} height="4.5rem" />
        </div>
      )}

      {!loading && error && <ErrorMessage message={error} onRetry={reload} />}

      {!loading && !error && transfers.length === 0 && (
        <EmptyState
          icon="💸"
          title="No transfers yet"
          message="Once you send money, your transfers will show up here."
          action={
            <Link to="/send">
              <Button>Send your first transfer</Button>
            </Link>
          }
        />
      )}

      {!loading && !error && transfers.length > 0 && (
        <>
          {selectedIds.size > 0 && (
            <div className="bulk-actions">
              <span className="bulk-count">{selectedIds.size} selected</span>
              <Button variant="secondary" onClick={exportSelected}>
                Export selected
              </Button>
              <Button variant="ghost" onClick={clear}>
                Clear selection
              </Button>
            </div>
          )}

          <div className="transfers-list">
            {transfers.map((t) => (
              <TransferRow
                key={t.id}
                transfer={t}
                selected={selectedIds.has(t.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
