import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Chart from '../../src/components/Chart.jsx'

describe('Chart component', () => {
  it('renders correctly with data', () => {
    const data = [{ value: 10 }, { value: 20 }]
    render(<Chart data={data} title="Test Chart" />)
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('shows empty state when data is an empty array', () => {
    render(<Chart data={[]} title="Test Chart" />)
    expect(screen.getByText('No chart data')).toBeInTheDocument()
    expect(screen.getByText('Add some data to visualize.')).toBeInTheDocument()
    expect(screen.queryByText('Download SVG')).not.toBeInTheDocument()
  })

  it('shows empty state when data is null', () => {
    render(<Chart data={null} title="Test Chart" />)
    expect(screen.getByText('No chart data')).toBeInTheDocument()
  })

  it('shows empty state when data is undefined', () => {
    render(<Chart title="Test Chart" />)
    expect(screen.getByText('No chart data')).toBeInTheDocument()
  })

  it('uses custom empty state props when provided', () => {
    render(
      <Chart
        data={[]}
        title="Test Chart"
        emptyStateIcon="💸"
        emptyStateTitle="Nothing to show"
        emptyStateMessage="Please add some data."
      />
    )
    expect(screen.getByText('Nothing to show')).toBeInTheDocument()
    expect(screen.getByText('Please add some data.')).toBeInTheDocument()
  })
})
