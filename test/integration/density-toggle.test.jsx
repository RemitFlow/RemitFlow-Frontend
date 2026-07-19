import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App.jsx'

describe('Density toggle', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    localStorage.clear()
  })

  it('defaults to comfortable density on mount', () => {
    render(<App />)

    expect(document.documentElement.dataset.density).toBe('comfortable')
  })

  it('toggles to compact and persists to localStorage', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Compact' }))

    expect(document.documentElement.dataset.density).toBe('compact')
    expect(localStorage.getItem('remitflow:density')).toBe('compact')
  })

  it('marks the active density option with aria-pressed', async () => {
    const user = userEvent.setup()
    render(<App />)

    const compact = screen.getByRole('button', { name: 'Compact' })
    const comfortable = screen.getByRole('button', { name: 'Comfortable' })

    expect(comfortable).toHaveAttribute('aria-pressed', 'true')
    expect(compact).toHaveAttribute('aria-pressed', 'false')

    await user.click(compact)

    expect(compact).toHaveAttribute('aria-pressed', 'true')
    expect(comfortable).toHaveAttribute('aria-pressed', 'false')
  })
})
