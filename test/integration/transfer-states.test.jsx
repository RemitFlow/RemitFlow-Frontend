import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import { TRANSFER_STATUS_LABELS } from '../../src/components/StatusBadge.jsx';
import {
  TRANSFER_CONTRACT_VERSION,
  TRANSFER_STATUSES,
} from '../../src/services/contracts/transfer.js';
import { loadFixture, loadTransferFixtures } from '../fixtures/index.js';

const V1 = TRANSFER_CONTRACT_VERSION;

// Every fixture, dated inside the widest date-range preset so the default
// (unfiltered) view shows them all. No network, no live provider, fixed clock.
const ALL_STATES = loadTransferFixtures(V1).map(({ name, payload }, index) => ({
  name,
  payload: {
    ...payload,
    id: `tx_state_${index}`,
    createdAt: `2026-08-0${index + 1}T10:00:00Z`,
  },
}));

function seed(transfers) {
  localStorage.setItem('remitflow.transfers', JSON.stringify(transfers));
}

async function gotoTransfers() {
  window.history.pushState({}, '', '/transfers');
  render(<App />);
  await screen.findByRole('heading', { name: /your transfers/i });
}

describe('Transfers page — every contract state renders', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-15T12:00:00Z'));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders a badge for each lifecycle state, including legacy spellings', async () => {
    // PAGE_SIZE is 5, so assert against the first page and then the second.
    seed(ALL_STATES.map(({ payload }) => payload));
    await gotoTransfers();
    await screen.findByLabelText(/select all transfers on this page/i);

    const expectedLabels = ALL_STATES.map(({ payload }) => payload.status);
    const rendered = new Set();

    for (const page of [1, 2]) {
      if (page === 2) {
        await userEvent
          .setup({ advanceTimers: vi.advanceTimersByTime })
          .click(screen.getByRole('button', { name: /next/i }));
      }
      for (const label of Object.values(TRANSFER_STATUS_LABELS)) {
        if (screen.queryAllByText(label).length > 0) rendered.add(label);
      }
    }

    // Newest-first ordering puts the later fixtures on page 1; between the two
    // pages every declared state must have appeared.
    expect(expectedLabels.length).toBe(ALL_STATES.length);
    for (const status of TRANSFER_STATUSES) {
      expect(rendered).toContain(TRANSFER_STATUS_LABELS[status]);
    }
  });

  it('offers every contract state in the status filter', async () => {
    seed(ALL_STATES.map(({ payload }) => payload));
    await gotoTransfers();

    const select = await screen.findByLabelText(/filter by status/i);
    const values = within(select)
      .getAllByRole('option')
      .map((option) => option.value);
    expect(values).toEqual(['', ...TRANSFER_STATUSES]);
  });

  it('filters by a state that did not exist before this contract', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    seed([
      { ...loadFixture(V1, 'transfer.expired'), recipient: 'gone@example.com' },
      { ...loadFixture(V1, 'transfer.pending'), recipient: 'live@example.com' },
    ]);
    await gotoTransfers();
    await screen.findByText(/gone@exam/);

    await user.selectOptions(
      screen.getByLabelText(/filter by status/i),
      'expired',
    );

    await waitFor(() => {
      expect(window.location.search).toContain('status=expired');
      expect(screen.getByText(/gone@exam/)).toBeInTheDocument();
      expect(screen.queryByText(/live@exam/)).not.toBeInTheDocument();
    });
  });

  it('matches a legacy status in a bookmarked URL against the canonical one', async () => {
    seed([
      { ...loadFixture(V1, 'transfer.settled'), recipient: 'done@example.com' },
      { ...loadFixture(V1, 'transfer.pending'), recipient: 'live@example.com' },
    ]);
    // ?status=settled is the provider spelling; the row stores `completed`.
    window.history.pushState({}, '', '/transfers?status=settled');
    render(<App />);
    await screen.findByRole('heading', { name: /your transfers/i });

    await waitFor(() => {
      expect(screen.getByText(/done@exam/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/live@exam/)).not.toBeInTheDocument();
  });
});

describe('Transfers page — contract error states', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-15T12:00:00Z'));
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('drops a single corrupt record and still shows the rest', async () => {
    seed([
      loadFixture(V1, 'transfer.null-amount', { kind: 'breaking' }),
      { ...loadFixture(V1, 'transfer.pending'), recipient: 'live@example.com' },
    ]);
    await gotoTransfers();

    await waitFor(() => {
      expect(screen.getByText(/live@exam/)).toBeInTheDocument();
    });
    // The dropped row is logged with the actionable diff, never rendered as $0.00.
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('sendAmount'),
    );
  });

  it('reports a whole-response schema change instead of an empty list', async () => {
    seed([
      loadFixture(V1, 'transfer.renamed-amount', { kind: 'breaking' }),
      {
        ...loadFixture(V1, 'transfer.renamed-amount', { kind: 'breaking' }),
        id: 'tx_3002',
      },
    ]);
    await gotoTransfers();

    // "No transfers yet" here would be a lie — the transfers exist.
    expect(
      await screen.findByText(/did not match the expected format/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no transfers yet/i)).not.toBeInTheDocument();

    // One aggregate diff, not one per rejected row plus the aggregate.
    expect(console.error).toHaveBeenCalledTimes(1);
    const [diff] = console.error.mock.calls.at(-1);
    expect(diff).toContain('send_amount');
    expect(diff).toContain('looks like a renamed "sendAmount"');
  });
});
