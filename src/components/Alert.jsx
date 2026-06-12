import './Alert.css'

// Leading glyph shown for each alert tone.
const ICONS = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '⛔'
}

/**
 * Inline message banner for surfacing contextual notices.
 * @param {object} props
 * @param {'info'|'success'|'warning'|'error'} [props.variant] - tone
 * @param {string} [props.title] - optional bold heading
 * @param {React.ReactNode} props.children - the message body
 */
export default function Alert({ variant = 'info', title, children }) {
  return (
    <div className={`alert alert-${variant}`} role="alert">
      <span className="alert-icon" aria-hidden="true">
        {ICONS[variant]}
      </span>
      <div className="alert-body">
        {title && <strong className="alert-title">{title}</strong>}
        <div className="alert-message">{children}</div>
      </div>
    </div>
  )
}
