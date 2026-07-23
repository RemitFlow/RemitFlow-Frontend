import { Link } from 'react-router-dom'
import './Button.css'

/**
 * Reusable button.
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'} [props.variant] - visual style
 * @param {boolean} [props.disabled]
 * @param {Function} [props.onClick]
 * @param {'button'|'submit'} [props.type]
 * @param {string} [props.ariaLabel] - accessible label for icon-only buttons
 * @param {string} [props.title] - native tooltip text
 */
export default function Button({
  children,
  variant = 'primary',
  disabled = false,
  type = 'button',
  onClick,
  ariaLabel,
  title
}) {
  const className = `btn btn-${variant}`

  if (to) {
    if (disabled) {
      return (
        <span className={className} aria-disabled="true">
          {children}
        </span>
      )
    }

    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={className}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  )
}
