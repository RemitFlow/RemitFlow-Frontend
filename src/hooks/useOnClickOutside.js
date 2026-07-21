import { useEffect } from 'react';

/**
 * Call a handler when a click or touch lands outside the referenced element.
 * Useful for dismissing dropdowns, popovers and modals.
 * @param {React.RefObject} ref - ref to the element to watch
 * @param {Function} handler - invoked with the originating event
 */
export function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function listener(event) {
      const el = ref.current;
      if (!el || el.contains(event.target)) return;
      handler(event);
    }

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
