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

  it('renders the correct number of bars', () => {
    const data = [{ value: 10 }, { value: 20 }, { value: 30 }]
    const { container } = render(<Chart data={data} title="Test" />)
    const bars = container.querySelectorAll('.chart-bar')
    expect(bars).toHaveLength(3)
  })

  it('shows tooltip on bar hover', async () => {
    const user = userEvent.setup()
    const data = [{ value: 10 }, { value: 20 }]
    const { container } = render(<Chart data={data} title="Test" />)
    const bars = container.querySelectorAll('.chart-bar')

    await user.hover(bars[0])
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    await user.unhover(bars[0])
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('displays raw value in tooltip by default', async () => {
    const user = userEvent.setup()
    const data = [{ value: 42 }, { value: 20 }]
    const { container } = render(<Chart data={data} title="Test" />)
    const bars = container.querySelectorAll('.chart-bar')

    await user.hover(bars[0])
    expect(screen.getByRole('tooltip')).toHaveTextContent('42')
  })

  it('displays formatted value when formatValue is provided', async () => {
    const user = userEvent.setup()
    const data = [{ value: 42, currency: 'USD' }, { value: 20 }]
    const { container } = render(
      <Chart
        data={data}
        title="Test"
        formatValue={(d) => `$${d.value.toFixed(2)} ${d.currency || ''}`.trim()}
      />
    )
    const bars = container.querySelectorAll('.chart-bar')

    await user.hover(bars[0])
    expect(screen.getByRole('tooltip')).toHaveTextContent('$42.00 USD')
  })

  it('displays label in tooltip when data items have a label', async () => {
    const user = userEvent.setup()
    const data = [{ value: 100, label: 'alice@example.com' }, { value: 200 }]
    const { container } = render(<Chart data={data} title="Test" />)
    const bars = container.querySelectorAll('.chart-bar')

    await user.hover(bars[0])
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('100')
    expect(tooltip).toHaveTextContent('alice@example.com')
  })
})
