import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fingerprintTransferPayload,
  idempotencyKeyFor,
  newTransferIntentNonce,
  saveTransferOperation,
  getTransferOperation,
  getLatestRecoverableOperation,
  clearTransferOperation,
} from '../../src/utils/transferIntent.js';

describe('transferIntent', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('fingerprints the exact payload and changes when the payload changes', () => {
    const base = {
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 100,
      receiveAmount: 150000,
      fee: 1,
      rate: 1500,
    };
    const a = fingerprintTransferPayload(base);
    const b = fingerprintTransferPayload({ ...base, sendAmount: 101 });
    expect(a).not.toEqual(b);
    expect(fingerprintTransferPayload(base)).toEqual(a);
  });

  it('keeps distinct integer amounts and full decimal precision', () => {
    const base = {
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      receiveAmount: 1500,
      fee: 1,
      rate: 1500,
    };
    const fingerprints = [1, 10, 100, '0.000000001'].map((sendAmount) =>
      fingerprintTransferPayload({ ...base, sendAmount }),
    );
    expect(new Set(fingerprints).size).toBe(4);
    expect(fingerprintTransferPayload({ ...base, sendAmount: '0.10' })).toBe(
      fingerprintTransferPayload({ ...base, sendAmount: 0.1 }),
    );
  });

  it('derives a stable idempotency key for the same fingerprint', async () => {
    const fp = 'usd|ngn|100';
    const k1 = await idempotencyKeyFor(fp);
    const k2 = await idempotencyKeyFor(fp);
    expect(k1).toEqual(k2);
    expect(k1.startsWith('idem_')).toBe(true);
  });

  it('uses a new key for a separate identical transfer intent', async () => {
    const fingerprint = 'same recipient and amount';
    const first = await idempotencyKeyFor(
      fingerprint,
      newTransferIntentNonce(),
    );
    const second = await idempotencyKeyFor(
      fingerprint,
      newTransferIntentNonce(),
    );
    expect(second).not.toBe(first);
  });

  it('persists only a safe operation reference across reads', () => {
    saveTransferOperation({
      idempotencyKey: 'idem_abc',
      fingerprint: 'fp',
      transferId: 'tx_1',
      status: 'submitting',
    });
    expect(getTransferOperation('idem_abc')).toMatchObject({
      idempotencyKey: 'idem_abc',
      transferId: 'tx_1',
      status: 'submitting',
    });
    expect(getLatestRecoverableOperation()?.idempotencyKey).toBe('idem_abc');
    expect(getLatestRecoverableOperation('fp')?.idempotencyKey).toBe(
      'idem_abc',
    );
    expect(getLatestRecoverableOperation('other')).toBeNull();
    clearTransferOperation('idem_abc');
    expect(getTransferOperation('idem_abc')).toBeNull();
  });

  it('treats a changed payload as a new intent requiring a new key', async () => {
    const a = await idempotencyKeyFor(
      fingerprintTransferPayload({
        recipient: 'a@x.com',
        from: 'USD',
        to: 'NGN',
        sendAmount: 10,
        receiveAmount: 1000,
      }),
    );
    const b = await idempotencyKeyFor(
      fingerprintTransferPayload({
        recipient: 'a@x.com',
        from: 'USD',
        to: 'NGN',
        sendAmount: 11,
        receiveAmount: 1100,
      }),
    );
    expect(a).not.toEqual(b);
  });

  it('does not treat dismissed or failed ops as recoverable', () => {
    saveTransferOperation({
      idempotencyKey: 'idem_done',
      fingerprint: 'fp',
      transferId: 'tx_1',
      status: 'dismissed',
    });
    expect(getLatestRecoverableOperation()).toBeNull();
    saveTransferOperation({
      idempotencyKey: 'idem_fail',
      fingerprint: 'fp2',
      status: 'failed',
    });
    expect(getLatestRecoverableOperation()).toBeNull();
  });
});

describe('strict transfer recovery journal', () => {
  const storageKey = 'remitflow.transferOps';
  const operation = {
    idempotencyKey: 'idem_journal_retry',
    fingerprint: 'opaque_fingerprint',
    status: 'submitting',
  };

  function expectStorageError(action) {
    let error;
    try {
      action();
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      name: 'TransferOperationStorageError',
      message: 'Transfer recovery information is unavailable.',
    });
  }

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([null, '{}'])(
    'accepts an empty journal %j and recovers the exact opaque intent key',
    async (raw) => {
      if (raw !== null) sessionStorage.setItem(storageKey, raw);
      expect(
        getLatestRecoverableOperation(undefined, { strict: true }),
      ).toBeNull();
      const payload = {
        recipient: 'amina@example.com',
        from: 'USD',
        to: 'NGN',
        sendAmount: '25',
        receiveAmount: '36642.38',
        fee: '0.25',
        rate: '1480.5',
      };
      const fingerprint = await idempotencyKeyFor(
        fingerprintTransferPayload(payload),
      );
      const idempotencyKey = await idempotencyKeyFor(
        fingerprint,
        newTransferIntentNonce(),
      );
      saveTransferOperation(
        {
          ...payload,
          idempotencyKey,
          fingerprint,
          status: 'submitting',
        },
        { strict: true },
      );

      const recovered = getLatestRecoverableOperation(fingerprint, {
        strict: true,
      });
      expect(recovered).toEqual({
        idempotencyKey,
        fingerprint,
        transferId: null,
        status: 'submitting',
        updatedAt: expect.any(String),
      });
      expect(getTransferOperation(idempotencyKey)).toEqual(recovered);
      const stored = sessionStorage.getItem(storageKey);
      expect(stored).not.toContain(payload.recipient);
      expect(JSON.parse(stored)).toEqual({ [idempotencyKey]: recovered });

      saveTransferOperation(
        { ...recovered, status: 'unknown' },
        { strict: true },
      );
      expect(
        getLatestRecoverableOperation(fingerprint, { strict: true }),
      ).toMatchObject({
        idempotencyKey,
        fingerprint,
        status: 'unknown',
      });
      expect(
        Object.keys(JSON.parse(sessionStorage.getItem(storageKey))),
      ).toEqual([idempotencyKey]);
    },
  );

  it('preserves unrelated stored operations when a strict save succeeds', () => {
    saveTransferOperation({
      idempotencyKey: 'idem_prior',
      fingerprint: 'prior_fp',
      transferId: 'tx_prior',
      status: 'succeeded',
    });
    const prior = JSON.parse(sessionStorage.getItem(storageKey)).idem_prior;
    saveTransferOperation(operation, { strict: true });
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    expect(stored.idem_prior).toEqual(prior);
    expect(stored[operation.idempotencyKey]).toMatchObject(operation);
    expect(Object.keys(stored)).toHaveLength(2);
  });

  it('rejects failed strict writes without changing saved bytes and retries the same key', () => {
    saveTransferOperation({
      idempotencyKey: 'idem_prior',
      fingerprint: 'prior_fp',
      status: 'unknown',
    });
    const storedBefore = sessionStorage.getItem(storageKey);
    const nativeSetItem = Storage.prototype.setItem;
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (key, value) {
        if (this === sessionStorage && key === storageKey) {
          throw new DOMException(
            'Private write failure detail',
            'QuotaExceededError',
          );
        }
        return nativeSetItem.call(this, key, value);
      });

    expectStorageError(() =>
      saveTransferOperation(operation, { strict: true }),
    );
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(storageKey)).toBe(storedBefore);
    expect(
      getLatestRecoverableOperation(operation.fingerprint, { strict: true }),
    ).toBeNull();
    expect(
      getLatestRecoverableOperation('prior_fp', { strict: true })
        ?.idempotencyKey,
    ).toBe('idem_prior');

    setItem.mockRestore();
    saveTransferOperation(operation, { strict: true });
    expect(
      getLatestRecoverableOperation(operation.fingerprint, { strict: true }),
    ).toMatchObject(operation);
    expect(JSON.parse(sessionStorage.getItem(storageKey)).idem_prior).toEqual(
      JSON.parse(storedBefore).idem_prior,
    );
  });

  it('rejects inaccessible reads before lookup or overwrite and recovers the saved key', () => {
    saveTransferOperation(operation);
    const storedBefore = sessionStorage.getItem(storageKey);
    const nativeGetItem = Storage.prototype.getItem;
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(function (key) {
        if (this === sessionStorage && key === storageKey) {
          throw new DOMException(
            'Private read failure detail',
            'SecurityError',
          );
        }
        return nativeGetItem.call(this, key);
      });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    expectStorageError(() =>
      getLatestRecoverableOperation(operation.fingerprint, { strict: true }),
    );
    expectStorageError(() =>
      saveTransferOperation(
        {
          ...operation,
          idempotencyKey: 'idem_replacement',
        },
        { strict: true },
      ),
    );
    expect(setItem).not.toHaveBeenCalled();

    getItem.mockRestore();
    expect(sessionStorage.getItem(storageKey)).toBe(storedBefore);
    expect(
      getLatestRecoverableOperation(operation.fingerprint, { strict: true }),
    ).toMatchObject(operation);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('does not report an empty journal after a transient strict lookup failure', () => {
    saveTransferOperation(operation);
    const storedBefore = sessionStorage.getItem(storageKey);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('Transient private read detail', 'SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    expectStorageError(() =>
      getLatestRecoverableOperation(operation.fingerprint, { strict: true }),
    );
    expect(
      getLatestRecoverableOperation(operation.fingerprint, { strict: true }),
    ).toMatchObject(operation);
    expect(sessionStorage.getItem(storageKey)).toBe(storedBefore);
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '{private-journal-data',
    '[]',
    'null',
    '1',
    'true',
    '"private-journal-data"',
  ])(
    'rejects a present invalid journal %j without replacing its bytes',
    (raw) => {
      sessionStorage.setItem(storageKey, raw);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      expectStorageError(() =>
        getLatestRecoverableOperation(undefined, { strict: true }),
      );
      expectStorageError(() =>
        saveTransferOperation(operation, { strict: true }),
      );
      expect(setItem).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(storageKey)).toBe(raw);
    },
  );

  it.each(['succeeded', 'unknown', 'failed', 'dismissed'])(
    'keeps default %s status writes best-effort after a saved submission',
    (status) => {
      saveTransferOperation(operation, { strict: true });
      const storedBefore = sessionStorage.getItem(storageKey);
      const nativeSetItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
        function (key, value) {
          if (this === sessionStorage && key === storageKey) {
            throw new DOMException(
              'Private status-write detail',
              'QuotaExceededError',
            );
          }
          return nativeSetItem.call(this, key, value);
        },
      );

      expect(() =>
        saveTransferOperation({ ...operation, status }),
      ).not.toThrow();
      expect(sessionStorage.getItem(storageKey)).toBe(storedBefore);
      expect(
        getLatestRecoverableOperation(operation.fingerprint),
      ).toMatchObject(operation);
    },
  );

  it('keeps default recovery reads best-effort when storage is unavailable', () => {
    saveTransferOperation(operation);
    const storedBefore = sessionStorage.getItem(storageKey);
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('Private recovery detail', 'SecurityError');
      });
    expect(getLatestRecoverableOperation(operation.fingerprint)).toBeNull();
    expect(getTransferOperation(operation.idempotencyKey)).toBeNull();
    getItem.mockRestore();
    expect(sessionStorage.getItem(storageKey)).toBe(storedBefore);
  });
});
