import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './Button.css';

/**
 * Reusable button.
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'} [props.variant] - visual style
 * @param {boolean} [props.disabled]
 * @param {Function} [props.onClick]
 * @param {'button'|'submit'} [props.type]
 * @param {string} [props.ariaLabel] - accessible label for icon-only buttons
 * @param {string} [props.title] - native tooltip text
 * @param {string} [props.ariaHasPopup] - ARIA popup type when the button
 *   opens a dialog or menu (e.g. "dialog")
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    disabled = false,
    type = 'button',
    onClick,
    to,
    ariaLabel,
    title,
    ariaHasPopup,
  },
  ref,
) {
  const className = `btn btn-${variant}`;

  if (to) {
    if (disabled) {
      return (
        <span className={className} aria-disabled="true">
          {children}
        </span>
      );
    }

    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={className}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      aria-haspopup={ariaHasPopup}
      ref={ref}
    >
      {children}
    </button>
  );
});

export default Button;
