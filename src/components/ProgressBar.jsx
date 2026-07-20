import './ProgressBar.css';

/**
 * Horizontal progress indicator with an accessible value.
 * @param {object} props
 * @param {number} props.value - current progress
 * @param {number} [props.max] - the value representing 100%
 * @param {string} [props.label] - accessible label for screen readers
 */
export default function ProgressBar({ value, max = 100, label = 'Progress' }) {
  const safeMax = max > 0 ? max : 100;
  const pct = Math.min(100, Math.max(0, (Number(value) / safeMax) * 100));

  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
