import DataTable, { DataTableCell } from './DataTable.jsx'
import StatusBadge from './StatusBadge.jsx'
import { formatAmount, formatDate, shortenAddress } from '../utils/format.js'

export default {
  title: 'Components/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  argTypes: {
    loading: { control: 'boolean' },
    error: { control: 'text' }
  }
}

const TRANSFER_COLUMNS = [
  {
    key: 'recipient',
    label: 'Recipient',
    width: 240,
    minWidth: 140,
    render: (row) => (
      <DataTableCell label="To">
        <span
          title={row.recipient}
          style={{ fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace' }}
        >
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

const sampleData = [
  {
    id: '1',
    recipient: 'GAVP2TO4N5HK4HXCI7EXR6AZCYGNFYZJGWOFHWX2GRMZZZ3EFGH',
    from: 'USD',
    to: 'NGN',
    sendAmount: 450,
    receiveAmount: 694463.7,
    status: 'completed',
    createdAt: '2026-07-15T10:30:00Z'
  },
  {
    id: '2',
    recipient: 'GDJ7X2F3N5HK4HXCI7EXR6AZCYGNFYZJGWOFHWX2GRMZZZ3ABCD',
    from: 'EUR',
    to: 'INR',
    sendAmount: 200,
    receiveAmount: 17800.8,
    status: 'pending',
    createdAt: '2026-07-18T08:15:00Z'
  },
  {
    id: '3',
    recipient: 'GCB5P3M8N5HK4HXCI7EXR6AZCYGNFYZJGWOFHWX2GRMZZZ3WXYZ',
    from: 'USD',
    to: 'PHP',
    sendAmount: 150,
    receiveAmount: 8302.5,
    status: 'failed',
    createdAt: '2026-07-17T14:20:00Z'
  }
]

export const WithData = {
  args: {
    columns: TRANSFER_COLUMNS,
    data: sampleData,
    loading: false,
    error: null
  }
}

export const Loading = {
  args: {
    columns: TRANSFER_COLUMNS,
    data: [],
    loading: true,
    error: null
  }
}

export const Error = {
  args: {
    columns: TRANSFER_COLUMNS,
    data: [],
    loading: false,
    error: 'Could not load transfers. Please try again.',
    onRetry: () => {}
  }
}

export const Empty = {
  args: {
    columns: TRANSFER_COLUMNS,
    data: [],
    loading: false,
    error: null,
    emptyState: (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '2rem' }}>💸</p>
        <h3>No transfers yet</h3>
        <p style={{ color: 'var(--color-muted)' }}>
          Once you send money, your transfers will show up here.
        </p>
      </div>
    )
  }
}

export const SingleRow = {
  args: {
    columns: TRANSFER_COLUMNS,
    data: [sampleData[0]],
    loading: false,
    error: null
  }
}
