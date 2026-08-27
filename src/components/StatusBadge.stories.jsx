import StatusBadge from './StatusBadge.jsx';
import {
  TRANSFER_STATUSES,
  TRANSFER_STATUS_ALIASES,
} from '../services/contracts/transfer.js';

export default {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      // Driven by the contract so the control cannot drift from the data.
      options: [...TRANSFER_STATUSES, ...Object.keys(TRANSFER_STATUS_ALIASES)],
    },
  },
};

export const Quoted = { args: { status: 'quoted' } };
export const Validating = { args: { status: 'validating' } };
export const Authorizing = { args: { status: 'authorizing' } };
export const Pending = { args: { status: 'pending' } };
export const Completed = { args: { status: 'completed' } };
export const Failed = { args: { status: 'failed' } };
export const Expired = { args: { status: 'expired' } };

export const AllStatuses = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {TRANSFER_STATUSES.map((status) => (
        <StatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};

/** Provider spellings the adapter normalises on the way in. */
export const LegacySpellings = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {Object.keys(TRANSFER_STATUS_ALIASES).map((alias) => (
        <StatusBadge key={alias} status={alias} />
      ))}
    </div>
  ),
};

/** A status the contract does not know: visibly unexpected, never blank. */
export const UnknownStatus = { args: { status: 'in_flight' } };
