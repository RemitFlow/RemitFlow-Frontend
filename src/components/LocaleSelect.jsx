import { LOCALES } from '../constants/locales.js'
import './LocaleSelect.css'

/**
 * Dropdown for picking the locale used to format currency, numbers and
 * dates throughout the app.
 * @param {object} props
 * @param {string} props.value - selected locale code, e.g. "en-US"
 * @param {Function} props.onChange - called with the new locale code
 * @param {string} [props.label] - field label
 * @param {string} [props.id] - input id, also used for the label association
 * @param {string} [props.ariaLabel] - accessible name to use when no visible
 *   label is rendered (e.g. compact toolbar placements)
 */
export default function LocaleSelect({ value, onChange, label, id, ariaLabel }) {
  return (
    <div className="locale-select">
      {label && (
        <label htmlFor={id} className="locale-select-label">
          {label}
        </label>
      )}
      <select
        id={id}
        className="locale-select-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label ? undefined : ariaLabel}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  )
}
