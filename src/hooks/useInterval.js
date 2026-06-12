import { useEffect, useRef } from 'react'

/**
 * Run a callback on a fixed interval without re-subscribing on every render.
 * Pass a `delay` of `null` to pause the interval.
 * @param {Function} callback - invoked on each tick
 * @param {number|null} delay - interval in milliseconds, or null to pause
 */
export function useInterval(callback, delay) {
  const savedCallback = useRef(callback)

  // Keep the latest callback without restarting the timer.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay == null) return undefined
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
