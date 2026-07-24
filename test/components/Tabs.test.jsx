import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tabs from '../../src/components/Tabs.jsx'

const sampleTabs = [
  { label: 'Tab A', content: <p>Content A</p> },
  { label: 'Tab B', content: <p>Content B</p> },
  { label: 'Tab C', content: <p>Content C</p> }
]

function createTouchEvent(type, clientX, clientY = 100) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    value: [{ clientX, clientY }],
    configurable: true
  })
  return event
}

function fireSwipe(container, fromX, toX, y = 100) {
  const panels = container.querySelector('.tabs-panels')
  fireEvent(panels, createTouchEvent('touchstart', fromX, y))
  fireEvent(panels, createTouchEvent('touchmove', toX, y))
  fireEvent(panels, createTouchEvent('touchend', toX, y))
}

function getPanel(container, index) {
  return container.querySelector(`#tabpanel-${index}`)
}

describe('Tabs', () => {
  it('renders all tab labels', () => {
    render(<Tabs tabs={sampleTabs} />)
    expect(screen.getByRole('tab', { name: 'Tab A' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tab B' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tab C' })).toBeInTheDocument()
  })

  it('shows the first tab panel by default', () => {
    const { container } = render(<Tabs tabs={sampleTabs} />)
    expect(getPanel(container, 0)).not.toHaveAttribute('hidden')
    expect(getPanel(container, 1)).toHaveAttribute('hidden')
    expect(getPanel(container, 2)).toHaveAttribute('hidden')
  })

  it('switches tab on header click', async () => {
    const { container } = render(<Tabs tabs={sampleTabs} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: 'Tab B' }))
    expect(getPanel(container, 0)).toHaveAttribute('hidden')
    expect(getPanel(container, 1)).not.toHaveAttribute('hidden')
    expect(getPanel(container, 2)).toHaveAttribute('hidden')
  })

  it('marks the active tab with aria-selected', async () => {
    const user = userEvent.setup()
    render(<Tabs tabs={sampleTabs} />)

    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('aria-selected', 'false')

    await user.click(screen.getByRole('tab', { name: 'Tab B' }))
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onChange when tab changes', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Tabs tabs={sampleTabs} onChange={handleChange} />)
    await user.click(screen.getByRole('tab', { name: 'Tab C' }))

    expect(handleChange).toHaveBeenCalledWith(2)
  })

  it('respects controlled activeIndex prop', () => {
    const { container, rerender } = render(<Tabs tabs={sampleTabs} activeIndex={1} />)
    expect(getPanel(container, 1)).not.toHaveAttribute('hidden')

    rerender(<Tabs tabs={sampleTabs} activeIndex={2} />)
    expect(getPanel(container, 2)).not.toHaveAttribute('hidden')
  })

  it('does not fire onChange when same tab is clicked', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Tabs tabs={sampleTabs} onChange={handleChange} />)
    await user.click(screen.getByRole('tab', { name: 'Tab A' }))

    expect(handleChange).not.toHaveBeenCalled()
  })

  it('swipes left to go to next tab', () => {
    const { container } = render(<Tabs tabs={sampleTabs} />)
    fireSwipe(container, 300, 100)
    expect(getPanel(container, 1)).not.toHaveAttribute('hidden')
    expect(getPanel(container, 0)).toHaveAttribute('hidden')
  })

  it('does not swipe past the last tab', () => {
    const { container } = render(<Tabs tabs={sampleTabs} />)
    fireSwipe(container, 300, 100)
    fireSwipe(container, 300, 100)
    fireSwipe(container, 300, 100)
    expect(getPanel(container, 2)).not.toHaveAttribute('hidden')
  })

  it('does not swipe if delta is below threshold', () => {
    const { container } = render(<Tabs tabs={sampleTabs} />)
    fireSwipe(container, 150, 160)
    expect(getPanel(container, 0)).not.toHaveAttribute('hidden')
  })

  it('swipes right to go back to previous tab', () => {
    const { container } = render(<Tabs tabs={sampleTabs} />)
    fireSwipe(container, 300, 100)
    expect(getPanel(container, 1)).not.toHaveAttribute('hidden')

    fireSwipe(container, 100, 300)
    expect(getPanel(container, 0)).not.toHaveAttribute('hidden')
  })

  it('does not swipe left from the first tab', () => {
    const { container } = render(<Tabs tabs={sampleTabs} />)
    fireSwipe(container, 100, 300)
    expect(getPanel(container, 0)).not.toHaveAttribute('hidden')
  })

  it('has accessible tab markup', () => {
    render(<Tabs tabs={sampleTabs} />)

    const tabA = screen.getByRole('tab', { name: 'Tab A' })
    const panelA = screen.getByRole('tabpanel', { name: 'Tab A' })

    expect(tabA).toHaveAttribute('id', 'tab-0')
    expect(panelA).toHaveAttribute('id', 'tabpanel-0')
    expect(tabA).toHaveAttribute('aria-controls', 'tabpanel-0')
    expect(panelA).toHaveAttribute('aria-labelledby', 'tab-0')
  })

  it('renders empty when tabs array is empty', () => {
    const { container } = render(<Tabs tabs={[]} />)
    expect(container.querySelector('.tabs-header')).toBeInTheDocument()
    expect(container.querySelectorAll('.tabs-tab').length).toBe(0)
  })

  it('accepts additional className', () => {
    const { container } = render(<Tabs tabs={sampleTabs} className="extra-class" />)
    expect(container.firstChild).toHaveClass('extra-class')
    expect(container.firstChild).toHaveClass('tabs')
  })
})