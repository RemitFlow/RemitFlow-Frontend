import { useEffect, useId, useRef } from 'react';
import { useKeyPress } from '../hooks/useKeyPress.js';
import { useOnClickOutside } from '../hooks/useOnClickOutside.js';
import './Modal.css';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

/**
 * Accessible dialog rendered over an overlay.
 * Closes on Escape, overlay click, or the close button.
 *
 * Keyboard behaviour:
 * - On open, focus moves to the dialog panel so screen readers announce it.
 * - Tab / Shift+Tab cycle within the dialog (focus is trapped while open).
 * - On close, focus returns to the element that was focused before opening.
 * @param {object} props
 * @param {boolean} props.open - whether the dialog is visible
 * @param {Function} props.onClose - called when the dialog should close
 * @param {string} [props.title] - heading shown in the header; used as the
 *   dialog's accessible name
 * @param {React.ReactNode} props.children - dialog body content
 */
export default function Modal({ open, onClose, title, children }) {
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useId();

  // Move focus into the dialog while it is open, and restore focus to the
  // invoker when it closes or unmounts.
  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    panelRef.current?.focus();

    return () => {
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus();
      }
      previouslyFocusedRef.current = null;
    };
  }, [open]);

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = getFocusableElements(panel);
    if (focusables.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const activeElement = document.activeElement;
    const currentIndex = focusables.indexOf(activeElement);

    if (event.shiftKey) {
      // Backwards from the first stop (or an unfocused panel) wraps to the end.
      if (currentIndex <= 0) {
        event.preventDefault();
        focusables[focusables.length - 1].focus();
      }
    } else if (currentIndex === -1 || currentIndex === focusables.length - 1) {
      // Forwards past the last stop (or from the unfocused panel) wraps round.
      event.preventDefault();
      focusables[0].focus();
    }
  }

  useKeyPress('Escape', () => {
    if (open) onClose();
  });
  useOnClickOutside(panelRef, () => {
    if (open) onClose();
  });

  if (!open) return null;

  return (
    <div className="modal-overlay" onKeyDown={handleKeyDown}>
      <div
        className="modal-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          {/* h2: dialogs sit under the page's h1 in the heading outline. */}
          {title && (
            <h2 className="modal-title" id={titleId}>
              {title}
            </h2>
          )}
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
