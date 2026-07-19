import StatusBadge from './StatusBadge.jsx'
import { formatAmount, formatDate, shortenAddress } from '../utils/format.js'
import './TransferRow.css'

/**
 * A single row in the transfers list.
 * @param {object} props
 * @param {object} props.transfer - the transfer record
 */
export default function TransferRow({ transfer, selected = false, onToggle }) {
  const { recipient, from, to, sendAmount, receiveAmount, status, createdAt } = transfer

  return (
    <div className="transfer-row">
      {onToggle && (
        <input
          type="checkbox"
          className="transfer-select"
          checked={selected}
          onChange={() => onToggle(transfer.id)}
          aria-label={`Select transfer to ${shortenAddress(recipient, 10, 6)}`}
        />
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
