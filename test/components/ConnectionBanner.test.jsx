import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ConnectionBanner from '../../src/components/ConnectionBanner.jsx'

describe('ConnectionBanner', () => {
  afterEach(() => {
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
  })

  it('is hidden while online', () => {
    render(<ConnectionBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('appears when the browser goes offline and disappears when back online', () => {
    render(<ConnectionBanner />)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
