import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/App.jsx'
import Button from '../../src/components/Button.jsx'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusables(container = document) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true'
  )
}

function assertNoNestedInteractiveElements(container = document) {
  container.querySelectorAll('a[href], button').forEach((element) => {
    expect(
      element.querySelector('a[href], button, input, select, textarea')
    ).toBeNull()
  })
}

function focusIndex(elements, matcher) {
  return elements.findIndex(matcher)
}

describe('tab order across pages', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders navigation links as single focus stops', () => {
    render(
      <MemoryRouter>
        <Button to="/send">Send Money</Button>
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: 'Send Money' })).toHaveClass('btn')
    expect(screen.queryByRole('button', { name: 'Send Money' })).not.toBeInTheDocument()
  })

  it('keeps skip link before header and main content before footer on Home', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    await screen.findByRole('heading', { name: /send money home/i })

    const focusables = getFocusables()
    assertNoNestedInteractiveElements()

    expect(focusables[0]).toHaveClass('skip-link')

    const sendMoneyIndex = focusIndex(focusables, (el) =>
      el.textContent?.includes('Send Money')
    )
    const statusIndex = focusIndex(focusables, (el) => el.textContent?.trim() === 'Status')

    expect(sendMoneyIndex).toBeGreaterThan(-1)
    expect(statusIndex).toBeGreaterThan(sendMoneyIndex)
  })

  it('tabs through Send Money fields in visual order', async () => {
    window.history.pushState({}, '', '/send')
    render(<App />)

    await screen.findByRole('heading', { name: /send money/i })

    const user = userEvent.setup()
    const focusables = getFocusables()
    assertNoNestedInteractiveElements()

    const recipientIndex = focusIndex(
      focusables,
      (el) => el.id === 'recipient' || el.getAttribute('for') === 'recipient'
    )
    const amountIndex = focusIndex(focusables, (el) => el.id === 'amount')
    const fromIndex = focusIndex(focusables, (el) => el.id === 'from')
    const swapIndex = focusIndex(focusables, (el) =>
      el.getAttribute('aria-label')?.includes('Swap currencies')
    )
    const toIndex = focusIndex(focusables, (el) => el.id === 'to')
    const submitIndex = focusIndex(focusables, (el) =>
      el.textContent?.includes('Review & Send')
    )

    expect(recipientIndex).toBeLessThan(amountIndex)
    expect(amountIndex).toBeLessThan(fromIndex)
    expect(fromIndex).toBeLessThan(swapIndex)
    expect(swapIndex).toBeLessThan(toIndex)
    expect(toIndex).toBeLessThan(submitIndex)

    await user.tab()
    expect(document.activeElement).toHaveClass('skip-link')
  })

  it('keeps Transfers actions ahead of footer links', async () => {
    window.history.pushState({}, '', '/transfers')
    localStorage.setItem('remitflow.transfers', JSON.stringify([]))
    render(<App />)

    await screen.findByRole('heading', { name: /your transfers/i })

    const focusables = getFocusables()
    assertNoNestedInteractiveElements()

    const newTransferIndex = focusIndex(focusables, (el) =>
      el.textContent?.includes('New Transfer')
    )
    const statusIndex = focusIndex(focusables, (el) => el.textContent?.trim() === 'Status')

    expect(newTransferIndex).toBeGreaterThan(-1)
    expect(statusIndex).toBeGreaterThan(newTransferIndex)
  })

  it('uses one focus stop for the NotFound recovery action', async () => {
    window.history.pushState({}, '', '/missing-page')
    render(<App />)

    await screen.findByRole('heading', { name: /page not found/i })

    assertNoNestedInteractiveElements()
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveClass('btn')
    expect(screen.queryByRole('button', { name: 'Back to Home' })).not.toBeInTheDocument()
  })
})
