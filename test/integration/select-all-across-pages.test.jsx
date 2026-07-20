import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App.jsx'

// Seed more transfers than fit on a single page (PAGE_SIZE = 5) so the
// across-pages affordance has a reason to appear.
function seedTransfers(count) {
  const transfers = Array.from({ length: count }, (_, i) => ({
    id: `tx_${1000 + i}`,
    recipient: `person${i}@example.com`,
    from: 'USD',
    to: 'NGN',
    sendAmount: 100 + i,
    receiveAmount: (100 + i) * 1400,
    status: 'completed',
    createdAt: `2026-06-${String(i + 1).padStart(2, '0')}T10:00:00Z`
  }))
  localStorage.setItem('remitflow.transfers', JSON.stringify(transfers))
}

async function gotoTransfers() {
  window.history.pushState({}, '', '/transfers')
  render(<App />)
  await screen.findByRole('heading', { name: /your transfers/i })
  // Wait for the mock API's list to resolve.
  await screen.findByLabelText(/select all transfers on this page/i)
}

describe('Select all across pages', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('selecting the page reveals an affordance to select everything', async () => {
    const user = userEvent.setup()
    seedTransfers(7)
    await gotoTransfers()

    // Nothing selected yet, no affordance.
    expect(screen.getByText(/select all/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /select all 7 transfers/i })
    ).not.toBeInTheDocument()

    // Select every row on the current page.
    await user.click(screen.getByLabelText(/select all transfers on this page/i))

    expect(screen.getByText(/5 transfers selected/i)).toBeInTheDocument()
    expect(
      screen.getByText(/all 5 transfers on this page are selected/i)
    ).toBeInTheDocument()

    // Extend the selection to every transfer across all pages.
    await user.click(screen.getByRole('button', { name: /select all 7 transfers/i }))

    expect(screen.getByText(/7 transfers selected/i)).toBeInTheDocument()
    expect(screen.getByText(/all 7 transfers are selected/i)).toBeInTheDocument()
  })

  it('keeps cross-page selection when paging, and can clear it', async () => {
    const user = userEvent.setup()
    seedTransfers(7)
    await gotoTransfers()

    await user.click(screen.getByLabelText(/select all transfers on this page/i))
    await user.click(screen.getByRole('button', { name: /select all 7 transfers/i }))

    // Move to page 2: the two rows there should already be selected.
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument()

    const checkboxes = screen.getAllByRole('checkbox', { name: /select transfer to/i })
    expect(checkboxes).toHaveLength(2)
    checkboxes.forEach((cb) => expect(cb).toBeChecked())
    expect(screen.getByText(/7 transfers selected/i)).toBeInTheDocument()

    // Clear everything.
    await user.click(screen.getByRole('button', { name: /clear selection/i }))
    expect(screen.getByText('Select all')).toBeInTheDocument()
    screen
      .getAllByRole('checkbox', { name: /select transfer to/i })
      .forEach((cb) => expect(cb).not.toBeChecked())
  })

  it('does not offer the across-pages affordance for a single page', async () => {
    const user = userEvent.setup()
    seedTransfers(3)
    await gotoTransfers()

    await user.click(screen.getByLabelText(/select all transfers on this page/i))

    expect(screen.getByText(/3 transfers selected/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/on this page are selected/i)
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })
})
