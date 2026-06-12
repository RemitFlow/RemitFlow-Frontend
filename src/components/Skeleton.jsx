import './Skeleton.css'

/**
 * Animated placeholder block shown while content is loading.
 * @param {object} props
 * @param {number} [props.count] - how many placeholder rows to render
 * @param {string} [props.height] - CSS height of each row
 */
export default function Skeleton({ count = 1, height = '1rem' }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="skeleton-row" style={{ height }} />
      ))}
    </div>
  )
}
