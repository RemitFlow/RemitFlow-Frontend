import './EmptyState.css';

/**
 * Placeholder shown when there is no data to display.
 * @param {object} props
 * @param {string} [props.icon] - emoji or glyph
 * @param {string} props.title
 * @param {string} [props.message]
 * @param {React.ReactNode} [props.action] - optional call-to-action element
 */
export default function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
