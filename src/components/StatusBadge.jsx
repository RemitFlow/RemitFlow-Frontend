import './StatusBadge.css';

// Human-readable labels for each transfer status.
const LABELS = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
};

/**
 * Colored badge showing a transfer status.
 * @param {object} props
 * @param {'pending'|'completed'|'failed'} props.status
 */
export default function StatusBadge({ status }) {
  const label = LABELS[status] || status;
  return <span className={`status-badge status-${status}`}>{label}</span>;
}
