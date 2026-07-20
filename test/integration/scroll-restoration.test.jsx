import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScrollRestoration from '../../src/components/ScrollRestoration.jsx'

/**
 * Helper: programmatically scroll the window and dispatch the 'scroll'
 * event so the ScrollRestoration component records the new position.
 */
function simulateScroll(x, y) {
  window.scrollX = x
  window.scrollY = y
  window.dispatchEvent(new Event('scroll'))
}

/** A button that calls navigate(-1) — used to trigger POP navigations. */
function BackButton() {
  const navigate = useNavigate()
  return (
    <button data-testid="back-btn" onClick={() => navigate(-1)}>
      Go Back
    </button>
  )
}

/** A link that navigates forward — used to trigger PUSH navigations. */
function ForwardLink({ to, label }) {
  const navigate = useNavigate()
  return (
    <button data-testid={`nav-${label}`} onClick={() => navigate(to)}>
      {label}
    </button>
  )
}

/** Minimal page with a scroll target so the page has height. */
function Page({ label }) {
  return (
    <div style={{ minHeight: '200vh' }}>
      <h1>{label}</h1>
    </div>
  )
}

describe('Scroll restoration', () => {
  let scrollToSpy

  beforeEach(() => {
    localStorage.clear()
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    window.scrollX = 0
    window.scrollY = 0
  })

  function renderHarness(initialEntries = ['/']) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <ScrollRestoration />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Page label="Home" />
                <ForwardLink to="/send" label="send" />
                <ForwardLink to="/transfers" label="transfers" />
                <BackButton />
              </>
            }
          />
          <Route
            path="/send"
            element={
              <>
                <Page label="Send" />
                <ForwardLink to="/" label="home" />
                <ForwardLink to="/transfers" label="transfers" />
                <BackButton />
              </>
            }
          />
          <Route
            path="/transfers"
            element={
              <>
                <Page label="Transfers" />
                <ForwardLink to="/" label="home" />
                <ForwardLink to="/send" label="send" />
                <BackButton />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )
  }

  it('scrolls to top on a new (PUSH) navigation', async () => {
    const user = userEvent.setup()
    renderHarness()

    simulateScroll(0, 500)

    await user.click(screen.getByTestId('nav-send'))

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
  })

  it('restores scroll position on back (POP) navigation', async () => {
    const user = userEvent.setup()
    renderHarness()

    // Scroll down on home.
    simulateScroll(0, 500)

    // Navigate to Send (PUSH).
    await user.click(screen.getByTestId('nav-send'))

    // Scroll on the Send page.
    simulateScroll(0, 300)

    // Go back (POP).
    scrollToSpy.mockClear()
    await user.click(screen.getByTestId('back-btn'))

    expect(scrollToSpy).toHaveBeenCalledWith(0, 500)
  })

  it('scrolls to top on a PUSH navigation after a back navigation', async () => {
    const user = userEvent.setup()
    renderHarness()

    // Go to Send.
    await user.click(screen.getByTestId('nav-send'))
    simulateScroll(0, 400)

    // Back to Home.
    await user.click(screen.getByTestId('back-btn'))

    // Now navigate forward to Transfers (PUSH).
    scrollToSpy.mockClear()
    await user.click(screen.getByTestId('nav-transfers'))

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
  })

  it('restores the correct scroll position for each history entry', async () => {
    const user = userEvent.setup()
    renderHarness()

    // Scroll on home.
    simulateScroll(0, 200)

    // Go to Send.
    await user.click(screen.getByTestId('nav-send'))
    simulateScroll(0, 150)

    // Go to Transfers.
    await user.click(screen.getByTestId('nav-transfers'))
    simulateScroll(0, 350)

    // Go back to Send (one POP).
    scrollToSpy.mockClear()
    await user.click(screen.getByTestId('back-btn'))

    expect(scrollToSpy).toHaveBeenCalledWith(0, 150)
  })
})
