import { useToggle } from '../hooks/useToggle.js';
import './Tooltip.css';

/**
 * Wraps content and reveals a small text bubble on hover or focus.
 * @param {object} props
 * @param {string} props.text - the tooltip content
 * @param {React.ReactNode} props.children - the trigger element
 */
export default function Tooltip({ text, children }) {
  const [open, setOpen] = useToggle(false);

  return (
    <span
      className="tooltip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span className="tooltip-bubble" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}
