import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import { SNAPSHOT_TTL_MS } from '../../src/utils/transferSnapshot.js';

function seedTransfers(count) {
  const transfers = Array.from({ length: count }, (_, i) => ({
    id: `tx_${1000 + i}`,
    recipient: `person${i}@example.com`,
    from: 'USD',
    to: 'NGN',
    sendAmount: 100 + i,
    receiveAmount: (100 + i) * 1400,
    status: i % 2 === 0 ? 'completed' : 'pending',
    createdAt: `2026-06-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
  }));
  localStorage.setItem('remitflow.transfers', JSON.stringify(transfers));
  return transfers;
}

async function gotoTransfers() {
  window.history.pushState({}, '', '/transfers');
  render(<App />);
  await screen.findByRole('heading', { name: /your transfers/i });
  await screen.findByLabelText(/select all transfers on this page/i);
}

describe('Transfers snapshot pagination', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pages through a frozen snapshot without gaps', async () => {
    const user = userEvent.setup();
    seedTransfers(12);
    await gotoTransfers();

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();

    // Newest by createdAt: person11 is June 12.
    expect(
      screen.getByRole('group', { name: /transfer to person11@e/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: /transfer to person6@e/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText(/page 2 of 3/i)).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /transfer to person6@e/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: /transfer to person11@e/i }),
    ).not.toBeInTheDocument();
  });

  it('resets to page 1 when filters change', async () => {
    const user = userEvent.setup();
    seedTransfers(12);
    await gotoTransfers();

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText(/page 2 of /i)).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/filter by status/i),
      'pending',
    );

    expect(await screen.findByText(/page 1 of /i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('refreshes a settled transfer while retaining the pending snapshot membership', async () => {
    const user = userEvent.setup();
    const transfers = seedTransfers(12);
    await gotoTransfers();
    await user.selectOptions(
      screen.getByLabelText(/filter by status/i),
      'pending',
    );

    const rowName = /transfer to person11@e/i;
    expect(
      within(screen.getByRole('group', { name: rowName })).getByText('Pending'),
    ).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

    transfers[11].status = 'completed';
    localStorage.setItem('remitflow.transfers', JSON.stringify(transfers));
    await user.click(screen.getByRole('button', { name: /refresh list/i }));

    const refreshedRow = await screen.findByRole('group', { name: rowName });
    expect(within(refreshedRow).getByText('Completed')).toBeInTheDocument();
    expect(within(refreshedRow).queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it('retains all settled snapshot rows and selection totals until filters reset', async () => {
    const user = userEvent.setup();
    const transfers = seedTransfers(12);
    await gotoTransfers();
    await user.selectOptions(
      screen.getByLabelText(/filter by status/i),
      'pending',
    );
    await user.click(
      screen.getByLabelText(/select all transfers on this page/i),
    );
    await user.click(
      screen.getByRole('button', { name: 'Select all 6 transfers' }),
    );

    transfers.forEach((transfer) => {
      if (transfer.status === 'pending') transfer.status = 'completed';
    });
    localStorage.setItem('remitflow.transfers', JSON.stringify(transfers));
    await user.click(screen.getByRole('button', { name: /refresh list/i }));

    const newest = await screen.findByRole('group', {
      name: /transfer to person11@e/i,
    });
    expect(within(newest).getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('No matching transfers')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('group', { name: /transfer to /i }),
    ).toHaveLength(5);
    expect(screen.getByText('6 transfers selected')).toBeInTheDocument();
    expect(
      screen.getByText('All 6 transfers are selected.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    const oldest = await screen.findByRole('group', {
      name: /transfer to person1@e/i,
    });
    expect(within(oldest).getByText('Completed')).toBeInTheDocument();
    expect(
      screen.getAllByRole('group', { name: /transfer to /i }),
    ).toHaveLength(1);
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
    expect(screen.getByText('6 transfers selected')).toBeInTheDocument();

    // An explicit filter reset creates a new, genuinely empty pending snapshot.
    await user.selectOptions(
      screen.getByLabelText(/filter by status/i),
      'completed',
    );
    await screen.findByRole('group', { name: /transfer to person11@e/i });
    await user.selectOptions(
      screen.getByLabelText(/filter by status/i),
      'pending',
    );
    expect(
      await screen.findByText('No matching transfers'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: /transfer to /i }),
    ).not.toBeInTheDocument();
  });

  it('keeps selection totals scoped to the snapshot after a concurrent insert', async () => {
    const user = userEvent.setup();
    const transfers = seedTransfers(12);
    await gotoTransfers();
    await user.selectOptions(
      screen.getByLabelText(/filter by status/i),
      'pending',
    );
    await user.click(
      screen.getByLabelText(/select all transfers on this page/i),
    );
    await user.click(
      screen.getByRole('button', { name: 'Select all 6 transfers' }),
    );

    transfers.push({
      ...transfers[11],
      id: 'tx_concurrent',
      recipient: 'new@example.com',
      createdAt: '2026-06-13T10:00:00Z',
    });
    localStorage.setItem('remitflow.transfers', JSON.stringify(transfers));
    await user.click(screen.getByRole('button', { name: /refresh list/i }));

    await screen.findByRole('group', { name: /transfer to person11@e/i });
    expect(screen.getByText('6 transfers selected')).toBeInTheDocument();
    expect(
      screen.getByText('All 6 transfers are selected.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: /transfer to new@example.com/i }),
    ).not.toBeInTheDocument();
  });

  it('clears select-all when an expired snapshot includes a new transfer', async () => {
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const user = userEvent.setup();
    const transfers = seedTransfers(12);
    await gotoTransfers();
    await user.click(
      screen.getByLabelText(/select all transfers on this page/i),
    );
    await user.click(
      screen.getByRole('button', { name: 'Select all 12 transfers' }),
    );
    expect(screen.getByText('12 transfers selected')).toBeInTheDocument();

    transfers.push({
      ...transfers[11],
      id: 'tx_new_after_expiry',
      recipient: 'new@example.com',
      createdAt: '2026-06-13T10:00:00Z',
    });
    localStorage.setItem('remitflow.transfers', JSON.stringify(transfers));
    now += SNAPSHOT_TTL_MS + 1;
    await user.click(screen.getByRole('button', { name: /refresh list/i }));

    const newcomer = await screen.findByRole('group', {
      name: /transfer to new@example.com/i,
    });
    expect(within(newcomer).getByRole('checkbox')).not.toBeChecked();
    expect(
      screen.queryByText(/\d+ transfers? selected/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(/select all transfers on this page/i),
    ).not.toBeChecked();
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it('clears individual selections when snapshot recovery removes their rows', async () => {
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const user = userEvent.setup();
    const transfers = seedTransfers(12);
    await gotoTransfers();
    const selectedRow = screen.getByRole('group', {
      name: /transfer to person11@e/i,
    });
    await user.click(within(selectedRow).getByRole('checkbox'));
    expect(screen.getByText('1 transfer selected')).toBeInTheDocument();

    localStorage.setItem(
      'remitflow.transfers',
      JSON.stringify(transfers.slice(0, 11)),
    );
    now += SNAPSHOT_TTL_MS + 1;
    await user.click(screen.getByRole('button', { name: /refresh list/i }));

    await screen.findByRole('group', { name: /transfer to person10@e/i });
    expect(
      screen.queryByRole('group', { name: /transfer to person11@e/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('1 transfer selected')).not.toBeInTheDocument();
    for (const row of screen.getAllByRole('group', { name: /transfer to /i })) {
      expect(within(row).getByRole('checkbox')).not.toBeChecked();
    }
  });
});
