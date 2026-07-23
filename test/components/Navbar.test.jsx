import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Navbar from '../../src/components/Navbar.jsx'
import { AppProvider } from '../../src/context/AppContext.jsx'

function renderNavbar(initialRoute = '/') {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Navbar />
      </MemoryRouter>
    </AppProvider>
  )
}

describe('Navbar', () => {
  it('renders the brand name', () => {
    renderNavbar()
    expect(screen.getByText('RemitFlow')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    renderNavbar()
    const links = screen.getAllByText('Home')
    expect(links.length).toBe(2)
    expect(screen.getAllByText('Send Money').length).toBe(2)
    expect(screen.getAllByText('Transfers').length).toBe(2)
  })

  it('highlights the active link based on current route', () => {
    renderNavbar('/send')
    const sendLinks = screen.getAllByText('Send Money')
    const activeLinks = sendLinks.filter((l) => l.className.includes('active'))
    expect(activeLinks.length).toBe(2)
  })

  it('has a hamburger button with aria-label', () => {
    renderNavbar()
    const hamburger = screen.getByLabelText('Open menu')
    expect(hamburger).toBeInTheDocument()
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens the mobile drawer when hamburger is clicked', () => {
    renderNavbar()
    const hamburger = screen.getByLabelText('Open menu')
    fireEvent.click(hamburger)
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument()
    expect(hamburger.getAttribute('aria-expanded')).toBe('true')
    const drawer = document.querySelector('.navbar-drawer')
    expect(drawer).toHaveClass('navbar-drawer--open')
  })

  it('closes the mobile drawer when a nav link is clicked', () => {
    renderNavbar()
    const hamburger = screen.getByLabelText('Open menu')
    fireEvent.click(hamburger)

    const homeLink = screen.getAllByText('Home')[1]
    fireEvent.click(homeLink)

    expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
    const drawer = document.querySelector('.navbar-drawer')
    expect(drawer).not.toHaveClass('navbar-drawer--open')
  })

  it('closes the mobile drawer on Escape key', () => {
    renderNavbar()
    const hamburger = screen.getByLabelText('Open menu')
    fireEvent.click(hamburger)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
  })

  it('closes the mobile drawer when backdrop is clicked', () => {
    renderNavbar()
    const hamburger = screen.getByLabelText('Open menu')
    fireEvent.click(hamburger)

    const backdrop = document.querySelector('.navbar-backdrop')
    fireEvent.click(backdrop)

    expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
  })

  it('renders the LocaleSelect and WalletButton in the drawer on mobile', () => {
    renderNavbar()
    const hamburger = screen.getByLabelText('Open menu')
    fireEvent.click(hamburger)

    const localeSelects = screen.getAllByLabelText('Language & region')
    expect(localeSelects.length).toBe(2)
    expect(screen.getAllByText('Connect Wallet').length).toBe(2)
  })
})