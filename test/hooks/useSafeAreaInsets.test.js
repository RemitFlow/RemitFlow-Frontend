import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { useSafeAreaInsets } from '../../src/hooks/useSafeAreaInsets.js'

function setRootProperty(name, value) {
  document.documentElement.style.setProperty(name, value)
}

function clearRootProperty(name) {
  document.documentElement.style.removeProperty(name)
}

describe('useSafeAreaInsets', () => {
  beforeEach(() => {
    clearRootProperty('--safe-area-inset-top')
    clearRootProperty('--safe-area-inset-bottom')
    clearRootProperty('--safe-area-inset-left')
    clearRootProperty('--safe-area-inset-right')
  })

  it('returns 0 for all edges when CSS properties are not set', () => {
    const { result } = renderHook(() => useSafeAreaInsets())
    expect(result.current).toEqual({ top: 0, bottom: 0, left: 0, right: 0 })
  })

  it('reads values from CSS custom properties', () => {
    setRootProperty('--safe-area-inset-top', '44px')
    setRootProperty('--safe-area-inset-bottom', '34px')
    setRootProperty('--safe-area-inset-left', '0px')
    setRootProperty('--safe-area-inset-right', '0px')

    const { result } = renderHook(() => useSafeAreaInsets())
    expect(result.current).toEqual({ top: 44, bottom: 34, left: 0, right: 0 })
  })

  it('returns fractional pixel values', () => {
    setRootProperty('--safe-area-inset-top', '20.5px')
    const { result } = renderHook(() => useSafeAreaInsets())
    expect(result.current.top).toBeCloseTo(20.5)
  })

  it('updates on resize event', () => {
    const { result } = renderHook(() => useSafeAreaInsets())

    setRootProperty('--safe-area-inset-bottom', '44px')
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.bottom).toBe(44)
  })

  it('updates on orientationchange event', () => {
    const { result } = renderHook(() => useSafeAreaInsets())

    setRootProperty('--safe-area-inset-top', '50px')
    act(() => {
      window.dispatchEvent(new Event('orientationchange'))
    })

    expect(result.current.top).toBe(50)
  })
})
