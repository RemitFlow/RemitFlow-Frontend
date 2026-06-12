import './Loader.css'

/**
 * Simple spinner used for loading states.
 * @param {object} props
 * @param {string} [props.label] - optional text shown next to the spinner
 */
export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-spinner" aria-hidden="true" />
      {label && <span className="loader-label">{label}</span>}
    </div>
  )
}
