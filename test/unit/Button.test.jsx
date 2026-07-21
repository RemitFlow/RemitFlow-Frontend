import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button from '../../src/components/Button.jsx'

describe('Button', () => {
  it('renders children as text content', () => {
    render(<Button>Send Money</Button>)

    expect(screen.getByRole('button', { name: 'Send Money' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)

    await user.click(screen.getByRole('button', { name: 'Click me' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Disabled</Button>)

    await user.click(screen.getByRole('button', { name: 'Disabled' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies a custom aria-label for icon-only buttons', () => {
    render(<Button ariaLabel="Close">✕</Button>)

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('applies a custom title attribute', () => {
    render(<Button title="Close dialog">✕</Button>)

    expect(screen.getByTitle('Close dialog')).toBeInTheDocument()
  })

  it('sets the type attribute', () => {
    render(<Button type="submit">Submit</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})
