/**
 * Focus-visible behaviour tests (issue #123).
 *
 * These tests verify that every interactive control:
 *   1. Is reachable by keyboard (Tab) and receives focus.
 *   2. Has NOT had its outline suppressed via `outline: none` on a plain
 *      `:focus` rule — i.e. the element's computedStyle does not carry that
 *      property *before* focus, and the JSDOM environment does not apply it
 *      unconditionally.
 *
 * Note: JSDOM does not apply CSS stylesheets, so we cannot test the actual
 * rendered outline values. What we can confirm is that the elements are
 * focusable and that the component does not set `style="outline: none"`
 * inline (which would suppress the UA ring regardless of stylesheets).
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App.jsx'
import Button from '../../src/components/Button.jsx'
import CopyButton from '../../src/components/CopyButton.jsx'
import ErrorMessage from '../../src/components/ErrorMessage.jsx'
import Modal from '../../src/components/Modal.jsx'
import TextField from '../../src/components/TextField.jsx'
import CurrencySelect from '../../src/components/CurrencySelect.jsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assert that an element does NOT have an inline `outline: none` style, which
 * would prevent `:focus-visible` outlines from ever showing.
 */
function assertOutlineNotSuppressedInline(element) {
  expect(element.style.outline).not.toBe('none')
}

// ---------------------------------------------------------------------------
// TextField
// ---------------------------------------------------------------------------

describe('TextField focus-visible', () => {
  it('renders an input that can receive keyboard focus', async () => {
    const user = userEvent.setup()
    render(<TextField label="Email" id="email" value="" onChange={() => {}} />)

    const input = screen.getByLabelText('Email')
    await user.tab()
    expect(document.activeElement).toBe(input)
  })

  it('does not suppress outline inline on the input element', () => {
    render(<TextField label="Email" id="email" value="" onChange={() => {}} />)
    const input = screen.getByLabelText('Email')
    assertOutlineNotSuppressedInline(input)
  })
})

// ---------------------------------------------------------------------------
// CurrencySelect
// ---------------------------------------------------------------------------

describe('CurrencySelect focus-visible', () => {
  it('renders a select that can receive keyboard focus', async () => {
    const user = userEvent.setup()
    render(<CurrencySelect label="Currency" id="currency" value="USD" onChange={() => {}} />)

    const select = screen.getByLabelText('Currency')
    await user.tab()
    expect(document.activeElement).toBe(select)
  })

  it('does not suppress outline inline on the select element', () => {
    render(<CurrencySelect label="Currency" id="currency" value="USD" onChange={() => {}} />)
    const select = screen.getByLabelText('Currency')
    assertOutlineNotSuppressedInline(select)
  })
})

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

describe('Button focus-visible', () => {
  it('renders a button that can receive keyboard focus', async () => {
    const user = userEvent.setup()
    render(<Button>Submit</Button>)

    const btn = screen.getByRole('button', { name: 'Submit' })
    await user.tab()
    expect(document.activeElement).toBe(btn)
  })

  it('does not suppress outline inline on the button element', () => {
    render(<Button>Submit</Button>)
    const btn = screen.getByRole('button', { name: 'Submit' })
    assertOutlineNotSuppressedInline(btn)
  })
})

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

describe('CopyButton focus-visible', () => {
  it('renders a button that can receive keyboard focus', async () => {
    const user = userEvent.setup()
    render(<CopyButton value="ABC123" label="Copy address" />)

    const btn = screen.getByRole('button', { name: 'Copy address' })
    await user.tab()
    expect(document.activeElement).toBe(btn)
  })

  it('does not suppress outline inline on the button element', () => {
    render(<CopyButton value="ABC123" label="Copy address" />)
    const btn = screen.getByRole('button', { name: 'Copy address' })
    assertOutlineNotSuppressedInline(btn)
  })
})

// ---------------------------------------------------------------------------
// Modal close button
// ---------------------------------------------------------------------------

describe('Modal close button focus-visible', () => {
  it('renders a close button that can receive keyboard focus', async () => {
    const user = userEvent.setup()
    render(<Modal open onClose={() => {}} title="Test Modal"><p>content</p></Modal>)

    const closeBtn = screen.getByRole('button', { name: /close dialog/i })
    await user.tab()
    expect(document.activeElement).toBe(closeBtn)
  })

  it('does not suppress outline inline on the close button', () => {
    render(<Modal open onClose={() => {}} title="Test Modal"><p>content</p></Modal>)
    const closeBtn = screen.getByRole('button', { name: /close dialog/i })
    assertOutlineNotSuppressedInline(closeBtn)
  })
})

// ---------------------------------------------------------------------------
// ErrorMessage retry button
// ---------------------------------------------------------------------------

describe('ErrorMessage retry button focus-visible', () => {
  it('renders a retry button that can receive keyboard focus', async () => {
    const user = userEvent.setup()
    render(<ErrorMessage message="Something went wrong" onRetry={() => {}} />)

    const retryBtn = screen.getByRole('button', { name: /retry/i })
    await user.tab()
    expect(document.activeElement).toBe(retryBtn)
  })

  it('does not suppress outline inline on the retry button', () => {
    render(<ErrorMessage message="Something went wrong" onRetry={() => {}} />)
    const retryBtn = screen.getByRole('button', { name: /retry/i })
    assertOutlineNotSuppressedInline(retryBtn)
  })
})

// ---------------------------------------------------------------------------
// Send Money page — swap button
// ---------------------------------------------------------------------------

describe('SendMoney swap button focus-visible', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send')
    localStorage.clear()
  })

  it('renders the swap button and it can receive keyboard focus', async () => {
    const user = userEvent.setup()
    render(<App />)

    const swapBtn = screen.getByRole('button', { name: /swap currencies/i })
    swapBtn.focus()
    expect(document.activeElement).toBe(swapBtn)
  })

  it('does not suppress outline inline on the swap button', () => {
    render(<App />)
    const swapBtn = screen.getByRole('button', { name: /swap currencies/i })
    assertOutlineNotSuppressedInline(swapBtn)
  })
})
