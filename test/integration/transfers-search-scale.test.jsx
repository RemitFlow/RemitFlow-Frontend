import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import { DEMO_PUBLIC_KEY } from '../../src/services/wallet.js';

function buildHistory(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `tx_${String(i).padStart(4, '0')}`,
    recipient:
      i === 7
        ? 'amina@example.com'
        : `user${String(i).padStart(4, '0')}@example.com`,
    from: 'USD',
    to: 'NGN',
    sendAmount: 10 + i,
    receiveAmount: 1000 + i,
    status: i % 2 === 0 ? 'completed' : 'pending',
    createdAt: new Date(Date.UTC(2026, 5, 1, 12, 0, i)).toISOString(),
    actorId: DEMO_PUBLIC_KEY,
  }));
}

describe('Transfers search at scale', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/transfers');
    localStorage.setItem(
      'remitflow.transfers',
      JSON.stringify(buildHistory(120)),
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('keeps pagination responsive on a capped large history', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: /your transfers/i });
    await waitFor(() => {
      expect(screen.getByLabelText(/search transfers/i)).toBeInTheDocument();
    });

    // Page size is 5; capped list still exposes next page.
    const next = await screen.findByRole('button', { name: /next/i });
    expect(next).toBeEnabled();
  });

  it('debounces search into the URL and finds the matching recipient', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /your transfers/i });

    await user.type(screen.getByLabelText(/search transfers/i), 'amina');

    await waitFor(
      () => {
        expect(window.location.search).toContain('search=amina');
        expect(screen.getByText(/amina@exam/)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });
});
