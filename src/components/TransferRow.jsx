import StatusBadge from './StatusBadge.jsx'
import { formatAmount, formatDate, shortenAddress } from '../utils/format.js'
import { DEFAULT_LOCALE } from '../constants/locales.js'
import './TransferRow.css'

/**
 * A single row in the transfers list.
 * @param {object} props
 * @param {object} props.transfer - the transfer record
 * @param {string} [props.locale] - locale used for currency/date formatting
 */
export default function TransferRow({ transfer, locale = DEFAULT_LOCALE }) {
  const { recipient, from, to, sendAmount, receiveAmount, status, createdAt } = transfer

  return (
    <div className="transfer-row">
      <div className="transfer-cell transfer-recipient">
        <span className="transfer-label">To</span>
        <span title={recipient}>{shortenAddress(recipient, 10, 6)}</span>
      </div>

      <div className="transfer-cell">
        <span className="transfer-label">Sent</span>
        <span>{formatAmount(sendAmount, from, locale)}</span>
      </div>

      <div className="transfer-cell">
        <span className="transfer-label">Received</span>
        <span>{formatAmount(receiveAmount, to, locale)}</span>
      </div>

      <div className="transfer-cell">
        <span className="transfer-label">Date</span>
        <span>{formatDate(createdAt, locale)}</span>
      </div>

      <div className="transfer-cell transfer-status">
        <StatusBadge status={status} />
      </div>
    </div>
  )
}
