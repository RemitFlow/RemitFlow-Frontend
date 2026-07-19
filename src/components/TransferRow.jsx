import StatusBadge from './StatusBadge.jsx'
import { formatAmount, formatDate, shortenAddress } from '../utils/format.js'
import './TransferRow.css'

/**
 * A single row in the transfers list.
 * @param {object} props
 * @param {object} props.transfer - the transfer record
 * @param {string[]} [props.hiddenColumns] - column ids to hide
 *   (one of 'recipient', 'sent', 'received', 'date', 'status')
 */
export default function TransferRow({ transfer, hiddenColumns = [] }) {
  const { recipient, from, to, sendAmount, receiveAmount, status, createdAt } = transfer
  const isHidden = (id) => hiddenColumns.includes(id)

  return (
    <div className="transfer-row">
      {!isHidden('recipient') && (
        <div className="transfer-cell transfer-recipient">
          <span className="transfer-label">To</span>
          <span title={recipient}>{shortenAddress(recipient, 10, 6)}</span>
        </div>
      )}

      {!isHidden('sent') && (
        <div className="transfer-cell">
          <span className="transfer-label">Sent</span>
          <span>{formatAmount(sendAmount, from)}</span>
        </div>
      )}

      {!isHidden('received') && (
        <div className="transfer-cell">
          <span className="transfer-label">Received</span>
          <span>{formatAmount(receiveAmount, to)}</span>
        </div>
      )}

      {!isHidden('date') && (
        <div className="transfer-cell">
          <span className="transfer-label">Date</span>
          <span>{formatDate(createdAt)}</span>
        </div>
      )}

      {!isHidden('status') && (
        <div className="transfer-cell transfer-status">
          <StatusBadge status={status} />
        </div>
      )}
    </div>
  )
}
