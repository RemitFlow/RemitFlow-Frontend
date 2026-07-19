import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ScrollToTopButton from '../../src/components/ScrollToTopButton.jsx'

/** Set window.scrollY and fire a scroll event the way a real scroll would. */
function scrollTo(y) {
  Object.defineProperty(window, 'scrollY', { value: y, writable: true, configurable: true })
  act(() => {
    fireEvent.scroll(window)
  })
}

/** Stub prefers-reduced-motion to a fixed value for the duration of a test. */
function mockReducedMotion(reduced) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduced,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
}

// The button carries a `title` in every state (the accessible name is dropped
// while it is aria-hidden), so query by title to reach it regardless of state.
function getButton(title = /scroll to top/i) {
  return screen.getByTitle(title)
}

describe('ScrollToTopButton', () => {
  beforeEach(() => {
    scrollTo(0)
    window.scrollTo = vi.fn()
    mockReducedMotion(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is hidden and non-interactive at the top of the page', () => {
    render(<ScrollToTopButton />)
    const button = getButton()

    expect(button).toHaveAttribute('aria-hidden', 'true')
    expect(button).toHaveAttribute('tabindex', '-1')
    expect(button).not.toHaveClass('scroll-to-top--visible')
  })

  it('becomes visible after scrolling past the default threshold', () => {
    render(<ScrollToTopButton />)

    scrollTo(301)

    const button = getButton()
    expect(button).toHaveClass('scroll-to-top--visible')
    expect(button).toHaveAttribute('aria-hidden', 'false')
    expect(button).toHaveAttribute('tabindex', '0')
  })

  it('stays hidden until the threshold is exceeded', () => {
    render(<ScrollToTopButton threshold={500} />)

    scrollTo(400)
    expect(getButton()).not.toHaveClass('scroll-to-top--visible')

    scrollTo(501)
    expect(getButton()).toHaveClass('scroll-to-top--visible')
  })

  it('hides again when the user scrolls back to the top', () => {
    render(<ScrollToTopButton />)

    scrollTo(400)
    expect(getButton()).toHaveClass('scroll-to-top--visible')

    scrollTo(0)
    expect(getButton()).not.toHaveClass('scroll-to-top--visible')
  })

  it('scrolls smoothly to the top when clicked', async () => {
    const user = userEvent.setup()
    render(<ScrollToTopButton />)
    scrollTo(400)

    await user.click(getButton())

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
  })

  it('jumps instantly when the user prefers reduced motion', async () => {
    mockReducedMotion(true)
    const user = userEvent.setup()
    render(<ScrollToTopButton />)
    scrollTo(400)

    await user.click(getButton())

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto'
    })
  })

  it('applies a custom accessible label', () => {
    render(<ScrollToTopButton label="Back to top" />)

    const button = getButton(/back to top/i)
    expect(button).toHaveAttribute('aria-label', 'Back to top')
  })
})
