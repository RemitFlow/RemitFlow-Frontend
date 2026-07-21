import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App.jsx'

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
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'))
    window.history.pushState({}, '', '/transfers')
    localStorage.setItem('remitflow.transfers', JSON.stringify(TRANSFERS))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

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
      expect(window.location.search).toBe('')
    })
    expect(screen.getByText(/amina@exam/)).toBeInTheDocument()
    expect(screen.getByText(/GBQAZ7Z3X7/)).toBeInTheDocument()
  })

  it('filters by date-range preset and syncs to URL', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitForTransfers()

    await user.selectOptions(screen.getByLabelText(/filter by date range/i), '7d')

    await waitFor(() => {
      expect(window.location.search).toContain('range=7d')
      expect(screen.getByText(/GBQAZ7Z3X7/)).toBeInTheDocument()
      expect(screen.queryByText(/amina@exam/)).not.toBeInTheDocument()
    })
  })

  it('reads date-range preset from URL on page load', async () => {
    window.history.pushState({}, '', '/transfers?range=7d')
    render(<App />)

    await screen.findByText(/GBQAZ7Z3X7/)
    expect(screen.queryByText(/amina@exam/)).not.toBeInTheDocument()
  })
})
