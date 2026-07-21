import { useCallback, useState } from 'react';

/**
 * Manage a boolean flag with a stable toggle/set helper.
 * @param {boolean} [initial] - the initial value
 * @returns {[boolean, Function, Function]} the value, a toggle fn, and an
 *   explicit setter (call with no args to toggle, or a boolean to set)
 */
export function useToggle(initial = false) {
  const [value, setValue] = useState(Boolean(initial));

  const toggle = useCallback((next) => {
    setValue((prev) => (typeof next === 'boolean' ? next : !prev));
  }, []);

  return [value, toggle, setValue];
}
