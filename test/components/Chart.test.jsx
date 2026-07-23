import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Chart from '../../src/components/Chart.jsx'

describe('Chart component', () => {
  it('renders title', () => {
    const data = [{ value: 10 }, { value: 20 }]
    render(<Chart data={data} title="Test Chart" />)
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('renders shimmer placeholder when loading', () => {
    render(<Chart loading data={[]} title="Test Chart" />)
    const container = screen.getByText('Test Chart').closest('.chart-container')
    expect(container).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('.chart-shimmer')).toBeInTheDocument()
    expect(container.querySelector('.chart-shimmer-btn')).toBeInTheDocument()
  })
})
