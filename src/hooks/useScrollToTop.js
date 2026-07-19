import { useCallback, useEffect, useState } from 'react'

function readScrollY() {
  if (typeof window === 'undefined') return 0
  return window.scrollY ?? window.pageYOffset ?? 0
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Track vertical scroll position and expose a helper to jump back to the top.
 *
 * Visibility flips to `true` once the page is scrolled past `threshold` pixels,
 * so callers can reveal a "scroll to top" affordance only when it is useful.
 * The scroll animation respects the user's `prefers-reduced-motion` setting.
 *
 * @param {number} [threshold] - pixels scrolled before `visible` becomes true
 * @returns {{visible: boolean, scrollToTop: Function}} visibility flag and a
 *   stable callback that scrolls the window back to the top
 */
export function useScrollToTop(threshold = 300) {
  const [visible, setVisible] = useState(() => readScrollY() > threshold)

  useEffect(() => {
    function handleScroll() {
      setVisible(readScrollY() > threshold)
    }
    // Sync immediately in case the page loaded already scrolled.
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    })
  }, [])

  return { visible, scrollToTop }
}
