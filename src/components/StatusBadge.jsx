import { normalizeStatus } from '../services/contracts/transfer.js';
import './StatusBadge.css';

/**
 * Human-readable labels for every state in the transfer lifecycle. Exported so
 * the transfers filter and the badge cannot drift apart; the contract test
 * asserts this covers TRANSFER_STATUSES exactly.
 */
export const TRANSFER_STATUS_LABELS = {
  quoted: 'Quoted',
  validating: 'Validating',
  authorizing: 'Authorizing',
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
};

// Short explanations surfaced as a tooltip/accessible description, so a
// colour-coded pill is not the only way to know what a state means.
const DESCRIPTIONS = {
  quoted: 'Quote prepared, not yet submitted',
  validating: 'Checking recipient and amount',
  authorizing: 'Waiting for wallet authorization',
  pending: 'Sent, waiting to settle',
  completed: 'Funds delivered',
  failed: 'Transfer did not go through',
  expired: 'Quote expired before authorization',
};

/**
 * Colored badge showing a transfer status.
 *
 * Legacy and provider spellings (`settled`, `submitted`, ...) are normalised
 * through the transfer contract. A genuinely unknown status renders as a
 * neutral badge with the raw value rather than an unstyled, unlabelled pill.
 *
 * @param {object} props
 * @param {string} props.status - a status from TRANSFER_STATUSES or a known alias
 */
export default function StatusBadge({ status }) {
  const canonical = normalizeStatus(status);
  const label = canonical
    ? TRANSFER_STATUS_LABELS[canonical]
    : status || 'Unknown';
  const description = canonical ? DESCRIPTIONS[canonical] : undefined;

  return (
    <span
      className={`status-badge status-${canonical ?? 'unknown'}`}
      title={description}
    >
      {label}
    </span>
  );
}
