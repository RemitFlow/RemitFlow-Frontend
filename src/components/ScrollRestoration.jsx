import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/** Map of location.key → { x, y } scroll positions.  */
const scrollPositions = new Map()

/**
 * Persists and restores window scroll position across back/forward
 * navigations.  On new (PUSH) navigations it scrolls to the top;
 * on POP (back/forward) navigations it restores the previously saved
 * position for that history entry.
 *
 * Render this component *inside* `<BrowserRouter>` so the router
 * hooks are available.
 */
export default function ScrollRestoration() {
  const location = useLocation()
  const navigationType = useNavigationType()

  // Continuously record the current scroll position so the map entry
  // for the active location stays up to date.
  useEffect(() => {
    const record = () => {
      scrollPositions.set(location.key, {
        x: window.scrollX,
        y: window.scrollY
      })
    }

    window.addEventListener('scroll', record, { passive: true })
    // Initial save in case the user hasn't scrolled yet.
    record()

    return () => {
      // Persist the final position before the next route renders.
      record()
      window.removeEventListener('scroll', record)
    }
  }, [location.key])

  // Restore or reset scroll whenever the route changes.
  // useLayoutEffect runs synchronously after DOM mutations but before
  // the browser paints, so the scroll position is set without a flash.
  useLayoutEffect(() => {
    if (navigationType === 'POP') {
      const saved = scrollPositions.get(location.key)
      if (saved) {
        window.scrollTo(saved.x, saved.y)
        return
      }
    }

    // New navigation (PUSH / REPLACE) — scroll to top.
    window.scrollTo(0, 0)
  }, [location, navigationType])

  return null
}
