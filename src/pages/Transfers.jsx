import { Link } from 'react-router-dom'
import DataTable, { DataTableCell } from '../components/DataTable.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useTransfers } from '../hooks/useTransfers.js'
import { formatAmount, formatDate, shortenAddress } from '../utils/format.js'
import './Transfers.css'

/** Column definitions for the transfers data table. */
const TRANSFER_COLUMNS = [
  {
    key: 'recipient',
    label: 'Recipient',
    width: 240,
    minWidth: 140,
    render: (row) => (
      <DataTableCell label="To" className="data-table-cell-mono">
        <span title={row.recipient}>
          {shortenAddress(row.recipient, 10, 6)}
        </span>
      </DataTableCell>
    )
  },
  {
    key: 'sent',
    label: 'Sent',
    width: 140,
    minWidth: 100,
    render: (row) => (
      <DataTableCell label="Sent">{formatAmount(row.sendAmount, row.from)}</DataTableCell>
    )
  },
  {
    key: 'received',
    label: 'Received',
    width: 140,
    minWidth: 100,
    render: (row) => (
      <DataTableCell label="Received">{formatAmount(row.receiveAmount, row.to)}</DataTableCell>
    )
  },
  {
    key: 'date',
    label: 'Date',
    width: 130,
    minWidth: 90,
    render: (row) => (
      <DataTableCell label="Date">{formatDate(row.createdAt)}</DataTableCell>
    )
  },
  {
    key: 'status',
    label: 'Status',
    width: 130,
    minWidth: 90,
    align: 'right',
    render: (row) => (
      <DataTableCell label="Status">
        <StatusBadge status={row.status} />
      </DataTableCell>
    )
  }
]

/**
 * Transfers page: lists all transfers with their status.
 */
export default function Transfers() {
  const { transfers, loading, error, reload } = useTransfers()

  return (
    <div className="transfers">
      <div className="transfers-header">
        <h1 className="page-title">Your Transfers</h1>
        <Link to="/send">
          <Button>New Transfer</Button>
        </Link>
      </div>

      <DataTable
        id="transfers-table"
        columns={TRANSFER_COLUMNS}
        data={transfers}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyState={
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
        }
      />
    </div>
  )
}
