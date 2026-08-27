import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge, {
  TRANSFER_STATUS_LABELS,
} from '../../src/components/StatusBadge.jsx';
import {
  TRANSFER_STATUSES,
  TRANSFER_STATUS_ALIASES,
} from '../../src/services/contracts/transfer.js';

describe('StatusBadge', () => {
  it('has a label for every status the contract declares, and no extras', () => {
    // Guards the drift that let `settled` render as an unstyled raw string.
    expect(Object.keys(TRANSFER_STATUS_LABELS).sort()).toEqual(
      [...TRANSFER_STATUSES].sort(),
    );
  });

  it.each(TRANSFER_STATUSES)('renders the %s state', (status) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(TRANSFER_STATUS_LABELS[status]);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('status-badge', `status-${status}`);
    // Every known state carries an explanation, not just a colour.
    expect(badge).toHaveAttribute('title');
  });

  it.each(Object.entries(TRANSFER_STATUS_ALIASES))(
    'renders the %s alias as its canonical state',
    (alias, canonical) => {
      render(<StatusBadge status={alias} />);
      const badge = screen.getByText(TRANSFER_STATUS_LABELS[canonical]);
      expect(badge).toHaveClass(`status-${canonical}`);
    },
  );

  it('renders an unrecognised status visibly instead of as a blank pill', () => {
    render(<StatusBadge status="in_flight" />);
    const badge = screen.getByText('in_flight');
    expect(badge).toHaveClass('status-unknown');
    expect(badge).not.toHaveAttribute('title');
  });

  it('does not render an empty badge when the status is missing', () => {
    render(<StatusBadge status={undefined} />);
    expect(screen.getByText('Unknown')).toHaveClass('status-unknown');
  });
});
