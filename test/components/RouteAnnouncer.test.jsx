import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import RouteAnnouncer from '../../src/components/RouteAnnouncer.jsx'

function renderWithRoute(initialRoute) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <RouteAnnouncer />
      <nav>
        <Link to="/">Home</Link>
        <Link to="/send">Send Money</Link>
        <Link to="/transfers">Transfers</Link>
        <Link to="/unknown">Unknown</Link>
      </nav>
      <Routes>
        <Route path="/" element={<div>Home page</div>} />
        <Route path="/send" element={<div>Send money page</div>} />
        <Route path="/transfers" element={<div>Transfers page</div>} />
        <Route path="*" element={<div>Not found page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RouteAnnouncer', () => {
  it('announces navigation to the home page', () => {
    renderWithRoute('/')
    const announcer = screen.getByRole('status')
    expect(announcer).toHaveTextContent('Navigated to Home')
  })

  it('announces navigation to the send money page', () => {
    renderWithRoute('/send')
    const announcer = screen.getByRole('status')
    expect(announcer).toHaveTextContent('Navigated to Send Money')
  })

  it('announces navigation to the transfers page', () => {
    renderWithRoute('/transfers')
    const announcer = screen.getByRole('status')
    expect(announcer).toHaveTextContent('Navigated to Your Transfers')
  })

  it('announces navigation to an unknown route', () => {
    renderWithRoute('/unknown')
    const announcer = screen.getByRole('status')
    expect(announcer).toHaveTextContent('Navigated to Page not found')
  })

  it('has aria-live="polite" and aria-atomic="true" for screen reader compatibility', () => {
    renderWithRoute('/')
    const announcer = screen.getByRole('status')
    expect(announcer).toHaveAttribute('aria-live', 'polite')
    expect(announcer).toHaveAttribute('aria-atomic', 'true')
  })

  it('updates the announcement when navigating to a different route', async () => {
    const user = userEvent.setup()
    renderWithRoute('/')

    expect(screen.getByRole('status')).toHaveTextContent('Navigated to Home')

    await user.click(screen.getByRole('link', { name: /send money/i }))
    expect(screen.getByRole('status')).toHaveTextContent('Navigated to Send Money')
  })
})
