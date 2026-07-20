import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Footer from '../../src/components/Footer.jsx'

describe('Footer', () => {
  it('renders a status page link that opens in a new tab', () => {
    render(<Footer />)

    const link = screen.getByRole('link', { name: /status/i })
    expect(link).toHaveAttribute('href', 'https://status.remitflow.app')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
