import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import Sidebar from '../../src/components/Sidebar.jsx'

describe('Sidebar navigation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function renderSidebar(initialRoute = '/') {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Sidebar />
      </MemoryRouter>
    )
  }

  it('renders navigation links', () => {
    renderSidebar()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Send Money')).toBeInTheDocument()
    expect(screen.getByText('Transfers')).toBeInTheDocument()
  })

  it('highlights the active link based on current route', () => {
    renderSidebar('/send')
    const sendLink = screen.getByText('Send Money').closest('a')
    expect(sendLink.className).toContain('active')
  })

  it('has a toggle button that collapses and expands the sidebar', () => {
    renderSidebar()
    const toggle = screen.getByLabelText('Collapse sidebar')
    const sidebar = document.querySelector('.sidebar')

    expect(sidebar).not.toHaveClass('sidebar--collapsed')

    fireEvent.click(toggle)
    expect(sidebar).toHaveClass('sidebar--collapsed')
    expect(toggle.getAttribute('aria-label')).toBe('Expand sidebar')

    fireEvent.click(toggle)
    expect(sidebar).not.toHaveClass('sidebar--collapsed')
    expect(toggle.getAttribute('aria-label')).toBe('Collapse sidebar')
  })

  it('persists collapse state to localStorage', () => {
    renderSidebar()
    const toggle = screen.getByLabelText('Collapse sidebar')

    fireEvent.click(toggle)
    expect(JSON.parse(localStorage.getItem('sidebar-collapsed'))).toBe(true)

    fireEvent.click(toggle)
    expect(JSON.parse(localStorage.getItem('sidebar-collapsed'))).toBe(false)
  })

  it('restores persisted collapse state from localStorage', () => {
    localStorage.setItem('sidebar-collapsed', 'true')

    renderSidebar()
    const sidebar = document.querySelector('.sidebar')
    expect(sidebar).toHaveClass('sidebar--collapsed')
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
  })
})
