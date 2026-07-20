import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App.jsx'

describe('Send money form flows', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send')
    localStorage.clear()
  })

  it('shows validation feedback before allowing submission', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /review & send/i }))

    expect(await screen.findByText(/enter a valid email or stellar address/i)).toBeInTheDocument()
    expect(screen.getByText(/enter an amount greater than zero/i)).toBeInTheDocument()
  })

  it('submits a transfer and shows it on the transfers page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com')
    await user.type(screen.getByLabelText(/amount/i), '15')
    await user.selectOptions(screen.getByLabelText('To'), 'NGN')
    await user.click(screen.getByRole('button', { name: /review & send/i }))

    await screen.findByRole('heading', { name: /your transfers/i }, { timeout: 5000 })
    await waitFor(() => {
      expect(screen.getByText('$15.00')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0)
  })

  it('shows copy-transaction-hash buttons on transfer rows', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com')
    await user.type(screen.getByLabelText(/amount/i), '15')
    await user.selectOptions(screen.getByLabelText(/to/i), 'NGN')
    await user.click(screen.getByRole('button', { name: /review & send/i }))

    await screen.findByRole('heading', { name: /your transfers/i }, { timeout: 5000 })

    await waitFor(() => {
      const copyButtons = screen.getAllByRole('button', { name: /copy transaction hash/i })
      expect(copyButtons.length).toBeGreaterThan(0)
    })
  })
})

describe('Share link', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('pre-populates form fields from URL query parameters', async () => {
    window.history.pushState({}, '', '/send?amount=100&from=USD&to=EUR')
    render(<App />)

    // The amount field should be pre-filled from the query param.
    expect(screen.getByLabelText(/amount/i).value).toBe('100')

    // Currency selects should reflect the query params.
    expect(screen.getByLabelText(/^from/i).value).toBe('USD')
    expect(screen.getByLabelText(/^to/i).value).toBe('EUR')

    // A live quote should be shown with the transfer summary.
    await waitFor(() => {
      expect(screen.getByText(/recipient gets/i)).toBeInTheDocument()
    })
  })

  it('ignores invalid currency codes in query params and falls back to defaults', async () => {
    window.history.pushState({}, '', '/send?amount=50&from=XXX&to=YYY')
    render(<App />)

    expect(screen.getByLabelText(/amount/i).value).toBe('50')
    // Invalid currencies should fall back to the defaults (USD / NGN).
    expect(screen.getByLabelText(/^from/i).value).toBe('USD')
    expect(screen.getByLabelText(/^to/i).value).toBe('NGN')
  })

  it('renders the share link button that copies the URL', async () => {
    window.history.pushState({}, '', '/send')
    render(<App />)

    const shareBtn = screen.getByRole('button', { name: /copy share link/i })
    expect(shareBtn).toBeInTheDocument()

    // Type into the form so the share URL has params.
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/amount/i), '75')

    // The URL should be updated with the amount param so the button copies
    // the correct share URL.
    await waitFor(() => {
      expect(window.location.search).toContain('amount=75')
    })

    // The CopyButton component handles clipboard internally; verifying it
    // exists and has the correct accessible label is sufficient here.
    expect(shareBtn).toHaveAttribute('aria-label', 'Copy share link')
  })

  it('does not include default currency values in the share URL', async () => {
    window.history.pushState({}, '', '/send')
    render(<App />)

    // Without any user interaction, the URL should not include default
    // currency params (USD source, NGN dest).
    expect(window.location.search).not.toContain('from=USD')
    expect(window.location.search).not.toContain('to=NGN')

    // Changing to a non-default currency should add it to the URL.
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText(/^to/i), 'EUR')

    await waitFor(() => {
      expect(window.location.search).toContain('to=EUR')
    })
  })

  it('updates URL query params when form field values change', async () => {
    window.history.pushState({}, '', '/send')
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/amount/i), '200')

    // Changing the "to" currency should update the URL params.
    await user.selectOptions(screen.getByLabelText(/^to/i), 'EUR')

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search)
      expect(params.get('amount')).toBe('200.00')
      expect(params.get('to')).toBe('EUR')
    })
  })
})
