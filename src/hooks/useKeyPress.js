import { useEffect, useRef } from 'react';

/**
 * Run a handler whenever a specific key is pressed.
 * Handy for wiring up Escape-to-close or Enter-to-confirm shortcuts.
 * @param {string} targetKey - the KeyboardEvent.key value to match (e.g. "Escape")
 * @param {Function} handler - invoked with the keyboard event on a match
 */
export function useKeyPress(targetKey, handler) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === targetKey) {
        savedHandler.current(event);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [targetKey]);
}
