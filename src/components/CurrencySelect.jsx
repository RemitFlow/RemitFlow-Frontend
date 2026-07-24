import { CURRENCIES } from '../constants/currencies.js';
import './CurrencySelect.css';

/**
 * Dropdown for picking a currency.
 * @param {object} props
 * @param {string} props.value - selected currency code
 * @param {Function} props.onChange - called with the new code
 * @param {string} [props.label] - field label
 * @param {string} [props.id] - input id, also used for the label association
 */
export default function CurrencySelect({ value, onChange, label, id }) {
  return (
    <div className="currency-select">
      {label && (
        <label htmlFor={id} className="currency-select-label">
          {label}
        </label>
      )}
      <select
        id={id}
        className="currency-select-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code} — {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
