import { useCallback, useState } from 'react';

/**
 * State that is persisted to localStorage and survives reloads.
 * Falls back to in-memory state when storage is unavailable.
 * @param {string} key - the storage key
 * @param {*} initialValue - value used when nothing is stored yet
 * @returns {[*, Function]} the current value and a setter
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch (err) {
      return initialValue;
    }
  });

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch (err) {
          // storage may be unavailable; keep the in-memory value.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
