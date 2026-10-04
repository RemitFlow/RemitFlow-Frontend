import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTransfers } from '../../src/hooks/useTransfers.js';
import * as api from '../../src/services/api.js';
import { DEMO_PUBLIC_KEY } from '../../src/services/wallet.js';

function transfer(overrides = {}) {
  return {
    id: 'tx_created',
    recipient: 'amina@example.com',
    from: 'USD',
    to: 'NGN',
    sendAmount: '1',
    receiveAmount: '2',
    status: 'completed',
    createdAt: new Date().toISOString(),
    actorId: 'GACTOR_A',
    ...overrides,
  };
}

describe('useTransfers race and cancellation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('does not let a stale slower response overwrite newer filters', async () => {
    let resolveSlow;
    const slow = new Promise((resolve) => {
      resolveSlow = resolve;
    });

    const listSpy = vi
      .spyOn(api, 'listTransfers')
      .mockImplementation((opts) => {
        if (opts.search === 'old') {
          return slow.then(() => [
            {
              id: 'tx_old',
              recipient: 'old@example.com',
              from: 'USD',
              to: 'NGN',
              sendAmount: '1',
              receiveAmount: '2',
              status: 'completed',
              createdAt: '2026-06-01T00:00:00Z',
              actorId: DEMO_PUBLIC_KEY,
            },
          ]);
        }
        return Promise.resolve([
          {
            id: 'tx_new',
            recipient: 'new@example.com',
            from: 'USD',
            to: 'NGN',
            sendAmount: '1',
            receiveAmount: '2',
            status: 'completed',
            createdAt: '2026-06-02T00:00:00Z',
            actorId: DEMO_PUBLIC_KEY,
          },
        ]);
      });

    const { result, rerender } = renderHook(
      ({ search }) =>
        useTransfers({
          actorId: DEMO_PUBLIC_KEY,
          filters: { search },
        }),
      { initialProps: { search: 'old' } },
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });

    rerender({ search: 'new' });

    await waitFor(() => {
      expect(result.current.transfers.map((t) => t.id)).toEqual(['tx_new']);
    });

    await act(async () => {
      resolveSlow();
      await slow;
    });

    // Stale "old" payload must not clobber the current filter results.
    expect(result.current.transfers.map((t) => t.id)).toEqual(['tx_new']);
  });

  it('aborts the previous request when filters change', async () => {
    const signals = [];
    vi.spyOn(api, 'listTransfers').mockImplementation((opts) => {
      signals.push(opts.signal);
      return new Promise(() => {
        /* never resolves — cancellation is the assertion */
      });
    });

    const { rerender } = renderHook(
      ({ search }) =>
        useTransfers({
          actorId: DEMO_PUBLIC_KEY,
          filters: { search },
        }),
      { initialProps: { search: 'a' } },
    );

    await waitFor(() => expect(signals.length).toBe(1));
    rerender({ search: 'ab' });
    await waitFor(() => expect(signals.length).toBe(2));
    expect(signals[0].aborted).toBe(true);
  });

  it('passes actorId on every list request', async () => {
    const listSpy = vi.spyOn(api, 'listTransfers').mockResolvedValue([]);
    renderHook(() =>
      useTransfers({ actorId: 'GCUSTOM', filters: { status: 'pending' } }),
    );
    await waitFor(() => expect(listSpy).toHaveBeenCalled());
    expect(listSpy.mock.calls[0][0]).toMatchObject({
      actorId: 'GCUSTOM',
      status: 'pending',
    });
  });

  it('keeps a real delayed create in its original wallet after switching', async () => {
    vi.useFakeTimers();
    localStorage.setItem('remitflow.transfers', '[]');
    const { result, rerender } = renderHook(
      ({ actorId }) => useTransfers({ actorId }),
      { initialProps: { actorId: 'GACTOR_A' } },
    );
    await act(() => vi.advanceTimersByTimeAsync(400));

    let pending;
    act(() => {
      pending = result.current.addTransfer(transfer());
    });
    rerender({ actorId: 'GACTOR_B' });
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(result.current.loading).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(300));

    const created = await pending;
    expect(created.actorId).toBe('GACTOR_A');
    expect(JSON.parse(localStorage.getItem('remitflow.transfers'))).toEqual([
      created,
    ]);
    expect(result.current.transfers).toEqual([]);
  });

  it.each(['new filters', 'return to the original scope'])(
    'ignores an old create completion after %s',
    async (change) => {
      let finishCreate;
      vi.spyOn(api, 'createTransfer').mockImplementation(
        () =>
          new Promise((resolve) => {
            finishCreate = resolve;
          }),
      );
      const current = transfer({ id: 'tx_current' });
      vi.spyOn(api, 'listTransfers').mockResolvedValue([current]);
      const { result, rerender } = renderHook(
        ({ search }) =>
          useTransfers({ actorId: 'GACTOR_A', filters: { search } }),
        { initialProps: { search: '' } },
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      let pending;
      act(() => {
        pending = result.current.addTransfer(transfer());
      });

      rerender({ search: 'other' });
      await waitFor(() => expect(result.current.loading).toBe(false));
      if (change === 'return to the original scope') {
        rerender({ search: '' });
        await waitFor(() => expect(result.current.loading).toBe(false));
      }
      const created = transfer();
      await act(async () => {
        finishCreate(created);
        expect(await pending).toBe(created);
      });
      expect(result.current.transfers).toEqual([current]);
    },
  );

  it('uses canonical date and actor filters for create completions', async () => {
    vi.spyOn(api, 'listTransfers').mockResolvedValue([]);
    vi.spyOn(api, 'createTransfer').mockImplementation(
      async (payload) => payload,
    );
    const { result } = renderHook(() =>
      useTransfers({ actorId: 'GACTOR_A', filters: { range: '7d' } }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTransfer(
        transfer({
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        }),
      );
      await result.current.addTransfer(transfer({ actorId: 'GACTOR_B' }));
    });
    expect(result.current.transfers).toEqual([]);
  });

  it('merges matching creates once in canonical order after same-scope reload', async () => {
    const latest = transfer({ id: 'tx_z' });
    const duplicate = transfer({
      id: 'tx_b',
      status: 'settled',
      createdAt: latest.createdAt,
    });
    vi.spyOn(api, 'listTransfers').mockResolvedValue([latest, duplicate]);
    let finishCreate;
    vi.spyOn(api, 'createTransfer').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCreate = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useTransfers({
        actorId: 'GACTOR_A',
        filters: { search: '  AMINA  ', status: 'settled' },
        limit: 2,
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    let pending;
    act(() => {
      pending = result.current.addTransfer(transfer());
    });
    await act(async () => {
      await result.current.reload();
    });
    const updated = { ...duplicate, status: 'completed', receiveAmount: '3' };
    await act(async () => {
      finishCreate(updated);
      await pending;
    });
    expect(result.current.transfers).toEqual([latest, updated]);
  });

  it("does not replace a current actor row with another actor's colliding ID", async () => {
    const current = transfer({ id: 'tx_shared' });
    vi.spyOn(api, 'listTransfers').mockResolvedValue([current]);
    vi.spyOn(api, 'createTransfer').mockImplementation(
      async (payload) => payload,
    );
    const { result } = renderHook(() =>
      useTransfers({ actorId: ' GACTOR_A ' }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addTransfer(
        transfer({
          id: 'tx_shared',
          actorId: 'GACTOR_B',
        }),
      );
    });
    expect(result.current.transfers).toEqual([current]);
  });

  it('does not let an obsolete reload abort the current wallet request', async () => {
    const requests = [];
    const listSpy = vi.spyOn(api, 'listTransfers').mockImplementation(
      (options) =>
        new Promise((resolve) => {
          requests.push({ ...options, resolve });
        }),
    );
    const { result, rerender } = renderHook(
      ({ actorId }) => useTransfers({ actorId }),
      { initialProps: { actorId: 'GACTOR_A' } },
    );
    const oldReload = result.current.reload;
    rerender({ actorId: 'GACTOR_B' });
    act(() => {
      oldReload();
    });
    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(requests[1].signal.aborted).toBe(false);

    const current = transfer({ actorId: 'GACTOR_B' });
    await act(async () => {
      requests[1].resolve([current]);
    });
    await act(async () => {
      requests[0].resolve([transfer()]);
    });
    expect(result.current.transfers).toEqual([current]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
