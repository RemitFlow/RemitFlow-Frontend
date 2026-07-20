import StatusBadge from './StatusBadge.jsx'
import { formatAmount, formatDate, shortenAddress } from '../utils/format.js'
import './TransferRow.css'

/**
 * A single row in the transfers list.
 * @param {object} props
 * @param {object} props.transfer - the transfer record
 * @param {boolean} [props.selectable] - render a selection checkbox
 * @param {boolean} [props.selected] - whether the row is selected
 * @param {Function} [props.onToggleSelect] - called with the transfer id when toggled
 */
export default function TransferRow({ transfer, selectable = false, selected = false, onToggleSelect }) {
  const { id, recipient, from, to, sendAmount, receiveAmount, status, createdAt } = transfer

  return (
    <div className={`transfer-row${selected ? ' is-selected' : ''}`}>
      {selectable && (
        <div className="transfer-cell transfer-select">
          <input
            type="checkbox"
            className="transfer-checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(id)}
            aria-label={`Select transfer to ${recipient}`}
          />
        </div>
      )}

      <div className="transfer-cell transfer-recipient">
        <span className="transfer-label">To</span>
        <span title={recipient}>{shortenAddress(recipient, 10, 6)}</span>
      </div>

      <div className="transfer-cell">
        <span className="transfer-label">Sent</span>
        <span>{formatAmount(sendAmount, from)}</span>
      </div>

      <div className="transfer-cell">
        <span className="transfer-label">Received</span>
        <span>{formatAmount(receiveAmount, to)}</span>
      </div>

      <div className="transfer-cell">
        <span className="transfer-label">Date</span>
        <span>{formatDate(createdAt)}</span>
      </div>

      <div className="transfer-cell transfer-status">
        <StatusBadge status={status} />
      </div>
    </div>
  )
}
