import { useRef } from 'react';
import { useKeyPress } from '../hooks/useKeyPress.js';
import { useOnClickOutside } from '../hooks/useOnClickOutside.js';
import './Modal.css';

/**
 * Accessible dialog rendered over an overlay.
 * Closes on Escape, overlay click, or the close button.
 * @param {object} props
 * @param {boolean} props.open - whether the dialog is visible
 * @param {Function} props.onClose - called when the dialog should close
 * @param {string} [props.title] - heading shown in the header
 * @param {React.ReactNode} props.children - dialog body content
 */
export default function Modal({ open, onClose, title, children }) {
  const panelRef = useRef(null);

  useKeyPress('Escape', () => {
    if (open) onClose();
  });
  useOnClickOutside(panelRef, () => {
    if (open) onClose();
  });

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div
        className="modal-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          {title && <h3 className="modal-title">{title}</h3>}
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
