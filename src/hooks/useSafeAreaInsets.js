import { useEffect, useState } from 'react'

function readInset(name) {
  if (typeof document === 'undefined') return 0
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return 0
  const match = raw.match(/^(\d+(?:\.\d+)?)/)
  return match ? Number.parseFloat(match[1]) : 0
}

/**
 * Returns the current safe-area inset values in CSS pixels.
 * Updates on resize / orientation change so it reflects device rotation.
 * @returns {{ top: number, bottom: number, left: number, right: number }}
 */
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState(() => ({
    top: readInset('--safe-area-inset-top'),
    bottom: readInset('--safe-area-inset-bottom'),
    left: readInset('--safe-area-inset-left'),
    right: readInset('--safe-area-inset-right'),
  }))

  useEffect(() => {
    function sync() {
      setInsets({
        top: readInset('--safe-area-inset-top'),
        bottom: readInset('--safe-area-inset-bottom'),
        left: readInset('--safe-area-inset-left'),
        right: readInset('--safe-area-inset-right'),
      })
    }

    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  return insets
}
