import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DataTable, { DataTableCell } from '../../src/components/DataTable.jsx'
import StatusBadge from '../../src/components/StatusBadge.jsx'
import { formatAmount, formatDate, shortenAddress } from '../../src/utils/format.js'

const TEST_COLUMNS = [
  { key: 'name', label: 'Name', width: 200, minWidth: 100, render: (row) => <DataTableCell label="Name">{row.name}</DataTableCell> },
  { key: 'amount', label: 'Amount', width: 120, minWidth: 80, render: (row) => <DataTableCell label="Amount">{formatAmount(row.amount)}</DataTableCell> },
  { key: 'status', label: 'Status', width: 130, minWidth: 90, align: 'right', render: (row) => <DataTableCell label="Status"><StatusBadge status={row.status} /></DataTableCell> }
]

const TEST_DATA = [
  { id: '1', name: 'Alice', amount: 100, status: 'completed' },
  { id: '2', name: 'Bob', amount: 250, status: 'pending' },
  { id: '3', name: 'Charlie', amount: 75, status: 'failed' }
]

describe('DataTable', () => {
  it('renders column headers for all columns', () => {
    render(<DataTable columns={TEST_COLUMNS} data={TEST_DATA} />)

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
  })

  it('renders data rows with correct cell content', () => {
    render(<DataTable columns={TEST_COLUMNS} data={TEST_DATA} />)

    // Check cell content
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$250.00')).toBeInTheDocument()
  })

  it('renders resize handles between column headers', () => {
    render(<DataTable columns={TEST_COLUMNS} data={TEST_DATA} />)

    // There should be N-1 resize handles (one between each pair of columns)
    const handles = screen.getAllByRole('separator')
    expect(handles).toHaveLength(2) // 3 columns => 2 handles

    handles.forEach((handle) => {
      expect(handle).toHaveAttribute('tabindex', '0')
    })
  })

  it('renders skeleton loading state', () => {
    render(<DataTable columns={TEST_COLUMNS} data={[]} loading />)

    // Header should still be visible
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()

    // Skeleton rows should be present (but hidden from a11y tree)
    const skeletonRows = document.querySelectorAll('.data-table-row--skeleton')
    expect(skeletonRows.length).toBe(3)
  })

  it('renders error state with retry button', () => {
    const onRetry = vi.fn()
    render(
      <DataTable
        columns={TEST_COLUMNS}
        data={[]}
        error="Something went wrong"
        onRetry={onRetry}
      />
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /try again/i })
    expect(retryBtn).toBeInTheDocument()

    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders empty state when data is empty', () => {
    render(
      <DataTable
        columns={TEST_COLUMNS}
        data={[]}
        emptyState={<div>No records found</div>}
      />
    )

    expect(screen.getByText('No records found')).toBeInTheDocument()
  })

  it('applies alignment class to cells', () => {
    render(<DataTable columns={TEST_COLUMNS} data={[TEST_DATA[0]]} />)

    // The status column has align: 'right'
    const cells = screen.getAllByRole('cell')
    const statusCell = cells[2] // third cell: status
    expect(statusCell.className).toContain('data-table-align-right')

    const nameCell = cells[0] // first cell: name (default left)
    expect(nameCell.className).toContain('data-table-align-left')
  })

  it('sets grid style matching column widths', () => {
    render(<DataTable columns={TEST_COLUMNS} data={TEST_DATA} />)

    const header = document.querySelector('.data-table-header')
    const expectedTemplate = '200px 120px 130px'
    expect(header.style.gridTemplateColumns).toBe(expectedTemplate)
  })

  it('resizes columns when dragging a resize handle', () => {
    render(<DataTable columns={TEST_COLUMNS} data={TEST_DATA} />)

    const handles = screen.getAllByRole('separator')
    const firstHandle = handles[0] // between Name (200px) and Amount (120px)

    // Verify initial grid template
    const header = document.querySelector('.data-table-header')
    expect(header.style.gridTemplateColumns).toBe('200px 120px 130px')

    // Start drag at x=200 (the boundary between Name and Amount)
    fireEvent.mouseDown(firstHandle, { clientX: 200 })

    // Drag 30px to the right (Name becomes 230, Amount becomes 90)
    fireEvent.mouseMove(document, { clientX: 230 })

    // Grid should now reflect the new widths
    expect(header.style.gridTemplateColumns).toBe('230px 90px 130px')

    // Release the mouse
    fireEvent.mouseUp(document)

    // Verify final state
    expect(header.style.gridTemplateColumns).toBe('230px 90px 130px')
  })

  it('respects minWidth when resizing columns', () => {
    render(<DataTable columns={TEST_COLUMNS} data={TEST_DATA} />)

    const handles = screen.getAllByRole('separator')
    const firstHandle = handles[0] // between Name (min 100) and Amount (min 80)

    // Start at x=200
    fireEvent.mouseDown(firstHandle, { clientX: 200 })

    // Try to drag far left — Name shrinks to min 100, Amount expands to 220
    fireEvent.mouseMove(document, { clientX: 100 })

    const header = document.querySelector('.data-table-header')
    // Name should be clamped at minWidth 100
    expect(header.style.gridTemplateColumns).toBe('100px 220px 130px')

    fireEvent.mouseUp(document)
  })
})
