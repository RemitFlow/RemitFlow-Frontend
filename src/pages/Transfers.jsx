import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TransferRow from '../components/TransferRow.jsx'
import Skeleton from '../components/Skeleton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Button from '../components/Button.jsx'
import Pagination from '../components/Pagination.jsx'
import SelectionToolbar from '../components/SelectionToolbar.jsx'
import { useTransfers } from '../hooks/useTransfers.js'
import { useSelection } from '../hooks/useSelection.js'
import './Transfers.css'

const PAGE_SIZE = 5

/**
 * Transfers page: lists all transfers with their status. Supports selecting
 * transfers across pages, including a "select all across pages" affordance.
 */
export default function Transfers() {
  const { transfers, loading, error, reload } = useTransfers()
  const selection = useSelection()
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(transfers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageTransfers = useMemo(
    () => transfers.slice(start, start + PAGE_SIZE),
    [transfers, start]
  )
  const pageIds = useMemo(() => pageTransfers.map((t) => t.id), [pageTransfers])

  const somePageSelected = pageIds.some((id) => selection.isSelected(id))
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selection.isSelected(id))
  const allAcrossSelected = transfers.length > 0 && selection.selectedCount === transfers.length
  const hasMorePages = transfers.length > pageTransfers.length

  const togglePage = () => {
    if (allPageSelected) selection.deselectMany(pageIds)
    else selection.selectMany(pageIds)
  }

  const selectAllAcross = () => selection.replaceAll(transfers.map((t) => t.id))

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
          <SelectionToolbar
            pageCount={pageTransfers.length}
            selectedCount={selection.selectedCount}
            totalCount={transfers.length}
            allPageSelected={allPageSelected}
            somePageSelected={somePageSelected}
            allAcrossSelected={allAcrossSelected}
            hasMorePages={hasMorePages}
            onTogglePage={togglePage}
            onSelectAllAcross={selectAllAcross}
            onClear={selection.clear}
          />

          <div className="transfers-list">
            {pageTransfers.map((t) => (
              <TransferRow
                key={t.id}
                transfer={t}
                selectable
                selected={selection.isSelected(t.id)}
                onToggleSelect={selection.toggle}
              />
            ))}
          </div>

          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
