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
  return (
    <button
      type={type}
      className={`btn btn-${variant}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  )
}
