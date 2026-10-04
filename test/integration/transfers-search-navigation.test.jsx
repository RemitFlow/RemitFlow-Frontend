import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import * as api from '../../src/services/api.js';

const ROWS = [
  {
    id: 'nav_a',
    recipient: 'amina@example.com',
    from: 'USD',
    to: 'NGN',
    sendAmount: 200,
    receiveAmount: 294620,
    status: 'completed',
    createdAt: '2026-06-02T10:15:00Z',
  },
  {
    id: 'nav_b',
    recipient: 'ben@example.com',
    from: 'USD',
    to: 'INR',
    sendAmount: 120,
    receiveAmount: 9920,
    status: 'pending',
    createdAt: '2026-06-02T08:42:00Z',
  },
];
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });
const searchInput = () => screen.getByLabelText(/search transfers/i);
function popTo(query) {
  act(() => {
    window.history.pushState({}, '', `/transfers${query}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}
async function open(query = '') {
  window.history.pushState({}, '', `/transfers${query}`);
  render(<App />);
  await screen.findByRole('heading', { name: /your transfers/i });
  await waitFor(() =>
    expect(document.querySelector('.skeleton')).not.toBeInTheDocument(),
  );
  await settle();
}

describe('Transfer search URL navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('remitflow.transfers', JSON.stringify(ROWS));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('keeps a navigated search instead of restoring the settled old query', async () => {
    await open('?search=amina');
    popTo('?search=ben');
    await settle();
    expect(window.location.search).toBe('?search=ben');
    expect(searchInput()).toHaveValue('ben');
    await screen.findByRole('checkbox', { name: /select transfer to ben/i });
    expect(
      screen.queryByRole('checkbox', { name: /select transfer to amina/i }),
    ).not.toBeInTheDocument();
  });

  it('retires an unfinished search when history changes the search', async () => {
    await open('?search=amina');
    fireEvent.change(searchInput(), { target: { value: 'cancelled-draft' } });
    popTo('?search=ben');
    await settle();
    expect(window.location.search).toBe('?search=ben');
    expect(searchInput()).toHaveValue('ben');
    await screen.findByRole('checkbox', { name: /select transfer to ben/i });
  });

  it('retires an unfinished search on POP even when only another filter changes', async () => {
    await open('?search=amina');
    fireEvent.change(searchInput(), { target: { value: 'cancelled-draft' } });
    popTo('?search=amina&status=completed');
    await settle();
    expect(window.location.search).toBe('?search=amina&status=completed');
    expect(searchInput()).toHaveValue('amina');
    await screen.findByRole('checkbox', { name: /select transfer to amina/i });
  });

  it('clears a committed search without resurrecting it after the debounce', async () => {
    await open('?search=missing&status=failed');
    fireEvent.click(
      await screen.findByRole('button', { name: /clear filters/i }),
    );
    await settle();
    expect(window.location.search).toBe('');
    expect(searchInput()).toHaveValue('');
    await screen.findByRole('checkbox', { name: /select transfer to amina/i });
    await screen.findByRole('checkbox', { name: /select transfer to ben/i });
  });

  it('preserves an unfinished edit when a local status control changes', async () => {
    await open();
    fireEvent.change(searchInput(), { target: { value: 'amina' } });
    fireEvent.change(screen.getByLabelText(/filter by status/i), {
      target: { value: 'completed' },
    });
    await settle();
    const params = new URLSearchParams(window.location.search);
    expect(params.get('search')).toBe('amina');
    expect(params.get('status')).toBe('completed');
    expect(searchInput()).toHaveValue('amina');
    await screen.findByRole('checkbox', { name: /select transfer to amina/i });
  });

  it('issues one real list query for a burst of edits and uses the final term', async () => {
    const calls = vi.spyOn(api, 'listTransfers');
    await open();
    calls.mockClear();
    fireEvent.change(searchInput(), { target: { value: 'am' } });
    fireEvent.change(searchInput(), { target: { value: 'ami' } });
    fireEvent.change(searchInput(), { target: { value: 'amina' } });
    await settle();
    expect(calls).toHaveBeenCalledTimes(1);
    expect(calls.mock.calls[0][0]).toMatchObject({ search: 'amina' });
    expect(window.location.search).toBe('?search=amina');
    await screen.findByRole('checkbox', { name: /select transfer to amina/i });
  });
});
