import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App.jsx'

describe('Transfers row selection with bulk actions', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send')
    localStorage.clear()
  })

  // Seed two transfers via the send flow, then navigate to /transfers.
  async function seedAndGoToTransfers(user) {
    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com')
    await user.type(screen.getByLabelText(/amount/i), '15')
    await user.selectOptions(screen.getByLabelText(/to/i), 'NGN')
    await user.click(screen.getByRole('button', { name: /review & send/i }))

    await screen.findByRole('heading', { name: /your transfers/i }, { timeout: 5000 })
    await waitFor(() => {
      expect(screen.getAllByText('$15.00').length).toBeGreaterThan(0)
    })
  }

  it('shows selection checkboxes and bulk bar toggles correctly', async () => {
    const user = userEvent.setup()
    render(<App />)

    await seedAndGoToTransfers(user)

    // No bulk bar before selecting.
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument()

    // There should be at least one selectable checkbox.
    const checkboxes = await screen.findAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)

    // Select the first transfer.
    await user.click(checkboxes[0])

    expect(await screen.findByText(/1 selected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export selected/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument()

    // Clear selection hides the bulk bar.
    await user.click(screen.getByRole('button', { name: /clear selection/i }))

    await waitFor(() => {
      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument()
    })
  })

  it('updates the count as more rows are selected', async () => {
    const user = userEvent.setup()
    render(<App />)

    await seedAndGoToTransfers(user)

    const checkboxes = await screen.findAllByRole('checkbox')
    await user.click(checkboxes[0])
    expect(await screen.findByText(/1 selected/i)).toBeInTheDocument()

    await user.click(checkboxes[1])
    expect(await screen.findByText(/2 selected/i)).toBeInTheDocument()

    // Deselect one.
    await user.click(checkboxes[0])
    expect(await screen.findByText(/1 selected/i)).toBeInTheDocument()
  })
})
