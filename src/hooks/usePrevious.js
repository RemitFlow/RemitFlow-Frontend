import { useEffect, useRef } from 'react';

/**
 * Remember the value a piece of state held on the previous render.
 * Returns `undefined` on the first render, then the prior value thereafter.
 * @param {*} value - the value to track
 * @returns {*} the value from the previous render
 */
export function usePrevious(value) {
  const ref = useRef(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
