import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import * as walletService from '../../src/services/wallet.js';

const TRANSFERS = [
  {
    id: 'tx_1001',
    recipient: 'amina@example.com',
    from: 'USD',
    to: 'NGN',
    sendAmount: 200,
    receiveAmount: 294620,
    status: 'completed',
    createdAt: '2026-05-28T10:15:00Z',
  },
  {
    id: 'tx_1002',
    recipient: 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF',
    from: 'USD',
    to: 'INR',
    sendAmount: 120,
    receiveAmount: 9920,
    status: 'pending',
    createdAt: '2026-06-02T08:42:00Z',
  },
];

describe('Transfers page filter sync', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'));
    window.history.pushState({}, '', '/transfers');
    localStorage.setItem('remitflow.transfers', JSON.stringify(TRANSFERS));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function waitForTransfers() {
    await screen.findByRole('heading', { name: /your transfers/i });
    await waitFor(() => {
      expect(screen.getByText(/amina@exam/)).toBeInTheDocument();
    });
  }

  it('shows all transfers when no filters are active', async () => {
    render(<App />);
    await waitForTransfers();
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
  });

  it('filters by status and syncs to URL', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitForTransfers();

    await user.selectOptions(
      screen.getByLabelText(/filter by status/i),
      'completed',
    );

    await waitFor(() => {
      expect(window.location.search).toContain('status=completed');
      expect(screen.getByText(/amina@exam/)).toBeInTheDocument();
      expect(screen.queryByText(/GBQAZ7Z3X7/)).not.toBeInTheDocument();
    });
  });

  it('filters by search term and syncs to URL', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitForTransfers();

    await user.type(screen.getByLabelText(/search transfers/i), 'amina');

    await waitFor(() => {
      expect(window.location.search).toContain('search=amina');
      expect(screen.getByText(/amina@exam/)).toBeInTheDocument();
      expect(screen.queryByText(/GBQAZ7Z3X7/)).not.toBeInTheDocument();
    });
  });

  it('reads filters from URL on page load', async () => {
    window.history.pushState({}, '', '/transfers?status=pending');
    render(<App />);

    await screen.findByText(/GBQAZ7Z3X7/);
    expect(screen.queryByText(/amina@exam/)).not.toBeInTheDocument();
  });

  it('shows empty state with clear action when filters produce no results', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/transfers?status=failed');
    render(<App />);

    await screen.findByText('No matching transfers');
    const clearBtn = screen.getByRole('button', { name: /clear filters/i });
    expect(clearBtn).toBeInTheDocument();
  });

  it('clears filters and resets URL when clear button is clicked', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/transfers?status=failed');
    render(<App />);
    await screen.findByText('No matching transfers');

    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
    await waitFor(() => {
      expect(screen.getByText(/amina@exam/)).toBeInTheDocument();
      expect(screen.getByText(/GBQAZ7Z3X7/)).toBeInTheDocument();
    });
  });

  it('filters by date-range preset and syncs to URL', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitForTransfers();

    await user.selectOptions(
      screen.getByLabelText(/filter by date range/i),
      '7d',
    );

    await waitFor(() => {
      expect(window.location.search).toContain('range=7d');
      expect(screen.getByText(/GBQAZ7Z3X7/)).toBeInTheDocument();
      expect(screen.queryByText(/amina@exam/)).not.toBeInTheDocument();
    });
  });

  it('reads date-range preset from URL on page load', async () => {
    window.history.pushState({}, '', '/transfers?range=7d');
    render(<App />);

    await screen.findByText(/GBQAZ7Z3X7/, undefined, { timeout: 4000 });
    expect(screen.queryByText(/amina@exam/)).not.toBeInTheDocument();
  });
});

describe('Transfers wallet scope', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/transfers?status=completed');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each(['individual', 'across pages'])(
    'resets pagination and %s selection when the wallet changes',
    async (selection) => {
      const user = userEvent.setup();
      const wallet = { publicKey: 'GWALLET_A', balance: 1000 };
      const makeTransfers = (actorId, count, prefix) =>
        Array.from({ length: count }, (_, i) => ({
          ...TRANSFERS[0],
          id: `${prefix}_${i}`,
          recipient: `${prefix}${i}@example.com`,
          actorId,
        }));
      localStorage.setItem('remitflow.wallet', JSON.stringify(wallet));
      localStorage.setItem(
        'remitflow.transfers',
        JSON.stringify([
          ...makeTransfers(wallet.publicKey, 7, 'walletA'),
          ...makeTransfers(walletService.DEMO_PUBLIC_KEY, 3, 'demo'),
        ]),
      );
      vi.spyOn(walletService, 'connectWallet').mockResolvedValue(wallet);

      render(<App />);
      const next = await screen.findByRole('button', { name: /next/i });
      await user.click(next);
      expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();

      if (selection === 'across pages') {
        await user.click(
          screen.getByLabelText(/select all transfers on this page/i),
        );
        await user.click(
          screen.getByRole('button', { name: /select all 7 transfers/i }),
        );
        expect(screen.getByText('7 transfers selected')).toBeInTheDocument();
      } else {
        await user.click(
          screen.getAllByRole('checkbox', { name: /select transfer to/i })[0],
        );
        expect(screen.getByText('1 transfer selected')).toBeInTheDocument();
      }

      // Keep the page mounted while the real context and list API switch
      // from the connected wallet to the smaller demo-actor history.
      await user.click(
        screen.getAllByRole('button', { name: /disconnect/i })[0],
      );
      await waitFor(() => {
        const rows = screen.getAllByRole('checkbox', {
          name: /select transfer to demo/i,
        });
        expect(rows).toHaveLength(3);
        rows.forEach((row) => expect(row).not.toBeChecked());
      });
      expect(screen.getByText('Select all')).toBeInTheDocument();
      expect(
        screen.queryByRole('navigation', { name: /pagination/i }),
      ).not.toBeInTheDocument();
      expect(window.location.search).toBe('?status=completed');

      // Returning to the original wallet must not resurrect its old page
      // or selection. Only the wallet adapter is mocked; view/data are real.
      await user.click(
        screen.getAllByRole('button', { name: /connect wallet/i })[0],
      );
      await screen.findByText(/page 1 of 2/i);
      const rows = screen.getAllByRole('checkbox', {
        name: /select transfer to walletA/i,
      });
      expect(rows).toHaveLength(5);
      rows.forEach((row) => expect(row).not.toBeChecked());
      expect(screen.getByText('Select all')).toBeInTheDocument();
      expect(window.location.search).toBe('?status=completed');
    },
  );
});
