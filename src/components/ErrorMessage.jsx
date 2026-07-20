import './ErrorMessage.css';

/**
 * Inline error banner with an optional retry action.
 * @param {object} props
 * @param {string} props.message
 * @param {Function} [props.onRetry]
 */
export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error-message" role="alert">
      <span>⚠️ {message}</span>
      {onRetry && (
        <button type="button" className="error-retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
