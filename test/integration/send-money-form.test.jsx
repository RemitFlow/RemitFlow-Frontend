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
})
