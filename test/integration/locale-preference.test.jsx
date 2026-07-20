import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App.jsx'

describe('Locale preference', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send')
    localStorage.clear()
  })

  it('reformats the quote when the locale preference changes, and persists the choice', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/amount/i), '1234')

    // Default locale (en-US): period as the decimal separator.
    expect(await screen.findByText('$1,234.00')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/language & region/i), 'fr-FR')

    // French formatting uses a comma as the decimal separator instead of a
    // period, and groups digits with a space rather than a comma.
    expect(await screen.findByText(/234,00/)).toBeInTheDocument()
    expect(screen.queryByText('$1,234.00')).not.toBeInTheDocument()

    expect(localStorage.getItem('remitflow:locale')).toBe(JSON.stringify('fr-FR'))
  })

  it('restores a persisted locale on the next visit', async () => {
    localStorage.setItem('remitflow:locale', JSON.stringify('fr-FR'))

    render(<App />)

    expect(await screen.findByLabelText(/language & region/i)).toHaveValue('fr-FR')
  })
})
