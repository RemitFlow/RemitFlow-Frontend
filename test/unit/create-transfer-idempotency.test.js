import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransfer, listTransfers } from '../../src/services/api.js';
import { normalizeError } from '../../src/services/errors.js';

const STORAGE_KEY = 'remitflow.transfers';

function storagePayload(idempotencyKey) {
  return {
    recipient: 'amina@example.com',
    from: 'USD',
    to: 'NGN',
    sendAmount: 50,
    receiveAmount: 75000,
    fee: 1,
    rate: 1500,
    idempotencyKey,
  };
}

describe('createTransfer idempotency', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the same transfer for a repeated idempotency key', async () => {
    const payload = {
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 50,
      receiveAmount: 75000,
      fee: 1,
      rate: 1500,
      idempotencyKey: 'idem_test_repeat_1',
    };
    const first = await createTransfer(payload);
    const second = await createTransfer(payload);
    expect(second.id).toBe(first.id);
    const all = await listTransfers();
    expect(
      all.filter((t) => t.idempotencyKey === 'idem_test_repeat_1'),
    ).toHaveLength(1);
  });

  it('dedupes concurrent creates that share an idempotency key', async () => {
    const payload = {
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 50,
      receiveAmount: 75000,
      fee: 1,
      rate: 1500,
      idempotencyKey: 'idem_concurrent_1',
    };
    const [a, b] = await Promise.all([
      createTransfer(payload),
      createTransfer(payload),
    ]);
    expect(a.id).toBe(b.id);
    const all = await listTransfers();
    expect(
      all.filter((t) => t.idempotencyKey === 'idem_concurrent_1'),
    ).toHaveLength(1);
  });

  it('rejects different payloads that reuse a key, even while the first is pending', async () => {
    const payload = {
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 50,
      receiveAmount: 75000,
      fee: 1,
      rate: 1500,
      idempotencyKey: 'idem_conflict',
    };
    const pending = createTransfer(payload);
    await expect(
      createTransfer({ ...payload, sendAmount: 51 }),
    ).rejects.toMatchObject({ name: 'ContractViolationError' });
    const original = await pending;
    await expect(
      createTransfer({ ...payload, sendAmount: 51 }),
    ).rejects.toMatchObject({ name: 'ContractViolationError' });
    const listed = await listTransfers();
    expect(
      listed.filter((t) => t.idempotencyKey === payload.idempotencyKey),
    ).toHaveLength(1);
    expect(original.sendAmount).toBe('50');
  });

  it('creates a new transfer when the idempotency key changes with the payload', async () => {
    const base = {
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 50,
      receiveAmount: 75000,
      fee: 1,
      rate: 1500,
    };
    const a = await createTransfer({ ...base, idempotencyKey: 'idem_a' });
    const b = await createTransfer({
      ...base,
      sendAmount: 51,
      idempotencyKey: 'idem_b',
    });
    expect(b.id).not.toBe(a.id);
  });

  it('rejects failed storage writes and safely retries the same key after recovery', async () => {
    const existing = await createTransfer(storagePayload('idem_preserved'));
    const storedBefore = localStorage.getItem(STORAGE_KEY);
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      });
    const payload = storagePayload('idem_storage_retry');
    const first = createTransfer(payload);
    const concurrent = createTransfer(payload);
    expect(concurrent).toBe(first);
    const outcomes = await Promise.allSettled([first, concurrent]);
    expect(outcomes.map((outcome) => outcome.status)).toEqual([
      'rejected',
      'rejected',
    ]);
    expect(normalizeError(outcomes[0].reason)).toMatchObject({
      code: 'unavailable',
      retryable: true,
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(storedBefore);

    // A record already persisted under another key needs no new write.
    const replay = await createTransfer(storagePayload('idem_preserved'));
    expect(replay.id).toBe(existing.id);
    expect(setItem).toHaveBeenCalledTimes(1);

    setItem.mockRestore();
    const recovered = await createTransfer(payload);
    const repeated = await createTransfer(payload);
    expect(repeated.id).toBe(recovered.id);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(
      stored.filter((row) => row.idempotencyKey === payload.idempotencyKey),
    ).toHaveLength(1);
    expect(stored.find((row) => row.id === existing.id)).toEqual(existing);
  });

  it('rejects unavailable storage reads without overwriting an existing key', async () => {
    const payload = storagePayload('idem_read_recovery');
    const original = await createTransfer(payload);
    const storedBefore = localStorage.getItem(STORAGE_KEY);
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('Storage access denied', 'SecurityError');
      });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await expect(createTransfer(payload)).rejects.toMatchObject({
      name: 'TransferStorageError',
      status: 503,
    });
    expect(setItem).not.toHaveBeenCalled();
    getItem.mockRestore();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(storedBefore);
    const recovered = await createTransfer(payload);
    expect(recovered.id).toBe(original.id);
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each(['', '{', '{}'])(
    'rejects a present invalid storage value %j without replacing it',
    async (raw) => {
      localStorage.setItem(STORAGE_KEY, raw);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      await expect(
        createTransfer(storagePayload('idem_corrupt_store')),
      ).rejects.toMatchObject({ name: 'TransferStorageError', status: 503 });
      expect(setItem).not.toHaveBeenCalled();
      expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    },
  );
});

describe('generated record identity', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T00:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it.each(['keyed', 'legacy'])(
    'owns receipt metadata for %s creation',
    async (mode) => {
      const payload = {
        ...storagePayload('idem_owned_metadata'),
        id: 'tx_1001',
        status: 'completed',
        createdAt: '2000-01-01T00:00:00.000Z',
      };
      if (mode === 'legacy') delete payload.idempotencyKey;
      const pending = createTransfer(payload);
      await vi.runAllTimersAsync();
      const created = await pending;
      const rows = JSON.parse(localStorage.getItem(STORAGE_KEY));
      console.log(
        'TRANSFER_RECORD_OBSERVATION',
        JSON.stringify({
          mode,
          id: created.id,
          status: created.status,
          createdAt: created.createdAt,
          rowCount: rows.length,
          uniqueIds: new Set(rows.map((row) => row.id)).size,
        }),
      );
      expect(created.id).not.toBe(payload.id);
      expect(created.status).toBe('pending');
      expect(created.createdAt).toBe('2026-10-04T00:00:00.700Z');
      expect(created.recipient).toBe(payload.recipient);
      expect(created.sendAmount).toBe('50');
      expect(created.idempotencyKey).toBe(payload.idempotencyKey);
      expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
      expect(rows.find((row) => row.id === 'tx_1001')).toMatchObject({
        status: 'completed',
        sendAmount: 200,
      });
    },
  );

  it('reuses the generated receipt despite ignored metadata on retries', async () => {
    const payload = storagePayload('idem_generated_replay');
    const pending = createTransfer(payload);
    const concurrent = createTransfer({
      ...payload,
      id: 'tx_1001',
      status: 'completed',
    });
    expect(concurrent).toBe(pending);
    await vi.runAllTimersAsync();
    const first = await pending;
    const retry = createTransfer({
      ...payload,
      id: 'tx_1001',
      status: 'completed',
      createdAt: '2000-01-01T00:00:00.000Z',
    });
    await vi.runAllTimersAsync();
    expect(await retry).toEqual(first);
    const rows = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(
      rows.filter((row) => row.idempotencyKey === payload.idempotencyKey),
    ).toHaveLength(1);
  });
});
