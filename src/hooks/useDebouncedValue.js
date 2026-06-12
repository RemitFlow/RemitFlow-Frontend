import { useEffect, useState } from 'react'

/**
 * Debounce a frequently-changing value.
 * Returns the latest value only after it has stayed unchanged for `delay` ms,
 * which is handy for throttling work driven by fast-typing inputs.
 * @param {*} value - the value to debounce
 * @param {number} [delay] - debounce delay in milliseconds
 * @returns {*} the debounced value
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
