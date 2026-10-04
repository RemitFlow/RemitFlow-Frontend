import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import * as api from '../../src/services/api.js';
import * as walletService from '../../src/services/wallet.js';
import { buildQuote } from '../../src/services/quote.js';
import {
  fingerprintTransferPayload,
  getLatestRecoverableOperation,
  idempotencyKeyFor,
  saveTransferOperation,
} from '../../src/utils/transferIntent.js';

async function fillValidForm(user, amount = '25') {
  await user.type(
    await screen.findByLabelText(/recipient/i),
    'amina@example.com',
  );
  await user.type(screen.getByLabelText(/^amount$/i), amount);
}

const RECOVERY_STORAGE_KEY = 'remitflow.transferOps';
const NOT_SUBMITTED_MESSAGE =
  'This attempt was not submitted because your browser could not preserve its recovery information. Check browser storage and try again.';

function seedConnectedWallet() {
  localStorage.setItem(
    'remitflow.wallet',
    JSON.stringify({
      publicKey: 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF',
      balance: 1000,
    }),
  );
}

async function confirmCurrentForm(user) {
  await user.click(screen.getByRole('button', { name: /review & send/i }));
  const dialog = await screen.findByRole('dialog', {
    name: /confirm your transfer/i,
  });
  await user.click(
    within(dialog).getByRole('button', { name: /confirm transfer/i }),
  );
}

describe('SendMoney duplicate-submission guard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    window.history.pushState({}, '', '/send');
    vi.restoreAllMocks();
    // Existing success paths need a deterministic accepted demo connection.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('double-confirm with the same payload creates only one transfer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    const confirm = within(dialog).getByRole('button', {
      name: /confirm transfer/i,
    });

    // Rapid double activation of Confirm; submissionLock + idempotency key
    // must keep a single persisted record.
    act(() => {
      confirm.click();
      confirm.click();
    });

    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );

    const listed = await api.listTransfers();
    const mine = listed.filter(
      (t) =>
        t.recipient === 'amina@example.com' &&
        Number(t.sendAmount) === 25 &&
        t.idempotencyKey,
    );
    expect(mine.length).toBe(1);
  });

  it('allows another identical transfer after the first was acknowledged', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillValidForm(user, '25');
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await user.click(screen.getByRole('button', { name: /review & send/i }));
      const confirm = await screen.findByRole('dialog', {
        name: /confirm your transfer/i,
      });
      await user.click(
        within(confirm).getByRole('button', { name: /confirm transfer/i }),
      );
      const success = await screen.findByRole(
        'dialog',
        { name: /transfer submitted/i },
        { timeout: 5000 },
      );
      await user.click(
        within(success).getByRole('button', { name: /^close$/i }),
      );
    }
    const listed = await api.listTransfers();
    const sent = listed.filter(
      (t) =>
        t.recipient === 'amina@example.com' &&
        Number(t.sendAmount) === 25 &&
        t.idempotencyKey,
    );
    expect(sent).toHaveLength(2);
    expect(sent[0].idempotencyKey).not.toBe(sent[1].idempotencyKey);
    expect(sessionStorage.getItem('remitflow.transferOps')).not.toContain(
      'amina@example.com',
    );
  });

  it('refresh restores in-flight status without creating a second transfer', async () => {
    const payload = {
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 25,
      receiveAmount: 36642.38,
      fee: 0.25,
      rate: 1480.5,
    };
    const fingerprint = fingerprintTransferPayload(payload);
    const idempotencyKey = await idempotencyKeyFor(fingerprint);
    const prior = await api.createTransfer({ ...payload, idempotencyKey });
    saveTransferOperation({
      idempotencyKey,
      fingerprint,
      transferId: prior.id,
      status: 'succeeded',
    });

    const spy = vi.spyOn(api, 'createTransfer');
    render(<App />);
    await screen.findByRole('heading', { name: /send money/i });

    // Reconcile restores the success dialog from the safe operation reference.
    expect(
      await screen.findByRole('dialog', { name: /transfer submitted/i }),
    ).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    const listed = await api.listTransfers();
    expect(
      listed.filter((t) => t.idempotencyKey === idempotencyKey),
    ).toHaveLength(1);
  });

  it('reconciles an accepted transfer after refresh even without its transfer id', async () => {
    const payload = {
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 25,
      receiveAmount: 36642.38,
      fee: 0.25,
      rate: 1480.5,
    };
    const fingerprint = await idempotencyKeyFor(
      fingerprintTransferPayload(payload),
    );
    const idempotencyKey = await idempotencyKeyFor(fingerprint, 'prior-intent');
    await api.createTransfer({ ...payload, idempotencyKey });
    saveTransferOperation({ idempotencyKey, fingerprint, status: 'unknown' });
    const spy = vi.spyOn(api, 'createTransfer');
    render(<App />);
    expect(
      await screen.findByRole('dialog', { name: /transfer submitted/i }),
    ).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    expect(getLatestRecoverableOperation()?.status).toBe('succeeded');
  });

  it('timeout retry with the same intent reuses the idempotency key', async () => {
    const payload = {
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 40,
      receiveAmount: 50000,
      fee: 0.4,
      rate: 1480.5,
      idempotencyKey: 'idem_timeout_reuse',
    };
    const first = await api.createTransfer(payload);
    // Simulate a client timeout after the server accepted: replay same key.
    const replay = await api.createTransfer(payload);
    expect(replay.id).toBe(first.id);
    const listed = await api.listTransfers();
    expect(
      listed.filter((t) => t.idempotencyKey === 'idem_timeout_reuse'),
    ).toHaveLength(1);
  });

  it('preserves an unknown intent through storage failure, refresh and retry', async () => {
    localStorage.setItem(
      'remitflow.wallet',
      JSON.stringify({
        publicKey: 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF',
        balance: 1000,
      }),
    );
    const nativeSetItem = Storage.prototype.setItem;
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (key, value) {
        if (this === localStorage && key === 'remitflow.transfers') {
          throw new DOMException(
            'Storage quota exceeded',
            'QuotaExceededError',
          );
        }
        return nativeSetItem.call(this, key, value);
      });
    const createSpy = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    const initial = render(<App />);
    await fillValidForm(user, '25');
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const confirm = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(confirm).getByRole('button', { name: /confirm transfer/i }),
    );
    await screen.findByText(
      /the service is temporarily unavailable\. please try again\./i,
      {},
      { timeout: 5000 },
    );
    expect(
      screen.queryByRole('dialog', { name: /transfer submitted/i }),
    ).toBeNull();
    const failedIntent = getLatestRecoverableOperation();
    expect(failedIntent.status).toBe('unknown');
    expect(failedIntent.transferId).toBeNull();
    expect(localStorage.getItem('remitflow.transfers')).toBeNull();

    initial.unmount();
    setItem.mockRestore();
    render(<App />);
    await screen.findByText(/transfer status is unknown/i);
    await fillValidForm(user, '25');
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const retry = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(retry).getByRole('button', { name: /confirm transfer/i }),
    );
    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(createSpy.mock.calls[0][0].idempotencyKey).toBe(
      failedIntent.idempotencyKey,
    );
    expect(createSpy.mock.calls[1][0].idempotencyKey).toBe(
      failedIntent.idempotencyKey,
    );
    const stored = JSON.parse(localStorage.getItem('remitflow.transfers'));
    expect(
      stored.filter(
        (row) => row.idempotencyKey === failedIntent.idempotencyKey,
      ),
    ).toHaveLength(1);
    expect(getLatestRecoverableOperation()?.status).toBe('succeeded');
  });

  it('navigation away and back restores the succeeded intent without a second create', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, 'createTransfer');
    render(<App />);

    await fillValidForm(user, '30');
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );
    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );

    const callsAfterSubmit = spy.mock.calls.length;
    expect(callsAfterSubmit).toBeGreaterThanOrEqual(1);
    expect(getLatestRecoverableOperation()?.status).toBe('succeeded');

    // Navigate to Transfers then back to Send — reconcile must not re-create.
    await user.click(screen.getByRole('button', { name: /view transfers/i }));
    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      {
        timeout: 5000,
      },
    );
    const sendLinks = screen.getAllByRole('link', { name: /send money/i });
    await user.click(sendLinks[0]);
    await screen.findByRole('heading', { name: /send money/i });

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: /transfer submitted/i }),
      ).toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalledTimes(callsAfterSubmit);
  });

  it('edited payload after a prior intent uses a new idempotency key', async () => {
    const firstKey = await idempotencyKeyFor(
      fingerprintTransferPayload({
        recipient: 'amina@example.com',
        from: 'USD',
        to: 'NGN',
        sendAmount: 10,
        receiveAmount: 1000,
        fee: 0.1,
        rate: 100,
      }),
    );
    const secondKey = await idempotencyKeyFor(
      fingerprintTransferPayload({
        recipient: 'amina@example.com',
        from: 'USD',
        to: 'NGN',
        sendAmount: 20,
        receiveAmount: 2000,
        fee: 0.2,
        rate: 100,
      }),
    );
    expect(firstKey).not.toEqual(secondKey);

    const a = await api.createTransfer({
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 10,
      receiveAmount: 1000,
      fee: 0.1,
      rate: 100,
      idempotencyKey: firstKey,
    });
    const a2 = await api.createTransfer({
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 10,
      receiveAmount: 1000,
      fee: 0.1,
      rate: 100,
      idempotencyKey: firstKey,
    });
    expect(a2.id).toBe(a.id);
    const b = await api.createTransfer({
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: 20,
      receiveAmount: 2000,
      fee: 0.2,
      rate: 100,
      idempotencyKey: secondKey,
    });
    expect(b.id).not.toBe(a.id);
  });

  it('refuses a failed recovery write before creating and retries with the same intent', async () => {
    seedConnectedWallet();
    const nativeSetItem = Storage.prototype.setItem;
    const attemptedOperations = [];
    const storageSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (key, value) {
        if (this === sessionStorage && key === RECOVERY_STORAGE_KEY) {
          attemptedOperations.push(...Object.values(JSON.parse(value)));
          throw new DOMException(
            'private storage detail',
            'QuotaExceededError',
          );
        }
        return nativeSetItem.call(this, key, value);
      });
    const createSpy = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);
    await fillValidForm(user);
    await confirmCurrentForm(user);

    expect(
      await screen.findByText(`⚠️ ${NOT_SUBMITTED_MESSAGE}`),
    ).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
    expect(attemptedOperations).toHaveLength(1);
    expect(attemptedOperations[0].status).toBe('submitting');
    expect(sessionStorage.getItem(RECOVERY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('remitflow.transfers')).toBeNull();
    expect(
      screen.queryByRole('dialog', { name: /transfer submitted/i }),
    ).toBeNull();
    expect(screen.queryByText(/private storage detail/i)).toBeNull();
    expect(
      screen.getByRole('button', { name: /review & send/i }),
    ).toBeEnabled();

    storageSpy.mockRestore();
    await confirmCurrentForm(user);
    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].idempotencyKey).toBe(
      attemptedOperations[0].idempotencyKey,
    );
    const stored = JSON.parse(localStorage.getItem('remitflow.transfers'));
    expect(stored.filter((row) => row.idempotencyKey)).toHaveLength(1);
    expect(getLatestRecoverableOperation()).toMatchObject({
      idempotencyKey: attemptedOperations[0].idempotencyKey,
      status: 'succeeded',
    });
  });

  it('refuses a transient recovery lookup failure and retries the existing key', async () => {
    seedConnectedWallet();
    const createSpy = vi.spyOn(api, 'createTransfer');
    const listSpy = vi.spyOn(api, 'listTransfers');
    const user = userEvent.setup();
    render(<App />);
    // Finish the initial load before adding a reference, so this attempt must
    // discover it through the confirmation lookup rather than mount recovery.
    await act(async () => {
      await listSpy.mock.results[0].value;
    });
    await fillValidForm(user);
    const fingerprint = await idempotencyKeyFor(
      fingerprintTransferPayload({
        ...buildQuote('25', 'USD', 'NGN'),
        recipient: 'amina@example.com',
      }),
    );
    const idempotencyKey = await idempotencyKeyFor(
      fingerprint,
      'existing-intent',
    );
    saveTransferOperation({ idempotencyKey, fingerprint, status: 'unknown' });
    const storedBefore = sessionStorage.getItem(RECOVERY_STORAGE_KEY);
    const nativeGetItem = Storage.prototype.getItem;
    let readFailures = 0;
    const readSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(function (key) {
        if (
          this === sessionStorage &&
          key === RECOVERY_STORAGE_KEY &&
          readFailures === 0
        ) {
          readFailures += 1;
          throw new DOMException('private read detail', 'SecurityError');
        }
        return nativeGetItem.call(this, key);
      });
    const writeSpy = vi.spyOn(Storage.prototype, 'setItem');
    await confirmCurrentForm(user);

    expect(
      await screen.findByText(`⚠️ ${NOT_SUBMITTED_MESSAGE}`),
    ).toBeInTheDocument();
    expect(readFailures).toBe(1);
    expect(createSpy).not.toHaveBeenCalled();
    const journalWrites = writeSpy.mock.calls.filter(
      ([key], index) =>
        writeSpy.mock.contexts[index] === sessionStorage &&
        key === RECOVERY_STORAGE_KEY,
    );
    expect(journalWrites).toHaveLength(0);
    expect(sessionStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(storedBefore);
    expect(localStorage.getItem('remitflow.transfers')).toBeNull();
    expect(screen.queryByText(/private read detail/i)).toBeNull();
    expect(
      screen.getByRole('button', { name: /review & send/i }),
    ).toBeEnabled();

    readSpy.mockRestore();
    await confirmCurrentForm(user);
    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].idempotencyKey).toBe(idempotencyKey);
    const stored = JSON.parse(localStorage.getItem('remitflow.transfers'));
    expect(stored.filter((row) => row.idempotencyKey)).toHaveLength(1);
    expect(getLatestRecoverableOperation()).toMatchObject({
      idempotencyKey,
      status: 'succeeded',
    });
  });

  it('keeps an accepted transfer visible when its recovery status write fails', async () => {
    seedConnectedWallet();
    const nativeSetItem = Storage.prototype.setItem;
    let statusWriteFailures = 0;
    const storageSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (key, value) {
        if (this === sessionStorage && key === RECOVERY_STORAGE_KEY) {
          const operations = Object.values(JSON.parse(value));
          if (operations.some((op) => op.status === 'succeeded')) {
            statusWriteFailures += 1;
            throw new DOMException(
              'private status detail',
              'QuotaExceededError',
            );
          }
        }
        return nativeSetItem.call(this, key, value);
      });
    const createSpy = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    const initial = render(<App />);
    await fillValidForm(user);
    await confirmCurrentForm(user);
    expect(
      await screen.findByRole(
        'dialog',
        { name: /transfer submitted/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(statusWriteFailures).toBeGreaterThan(0);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(`⚠️ ${NOT_SUBMITTED_MESSAGE}`)).toBeNull();
    expect(screen.queryByText(/private status detail/i)).toBeNull();
    const recoverable = getLatestRecoverableOperation();
    expect(recoverable).toMatchObject({
      idempotencyKey: createSpy.mock.calls[0][0].idempotencyKey,
      transferId: null,
      status: 'submitting',
    });
    const stored = JSON.parse(localStorage.getItem('remitflow.transfers'));
    expect(stored.filter((row) => row.idempotencyKey)).toHaveLength(1);
    expect(stored.find((row) => row.idempotencyKey)?.idempotencyKey).toBe(
      recoverable.idempotencyKey,
    );

    initial.unmount();
    storageSpy.mockRestore();
    render(<App />);
    expect(
      await screen.findByRole(
        'dialog',
        { name: /transfer submitted/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(getLatestRecoverableOperation()).toMatchObject({
      idempotencyKey: recoverable.idempotencyKey,
      status: 'succeeded',
    });
  });
});

describe('SendMoney wallet admission before intent persistence', () => {
  const account = {
    publicKey: 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF',
    balance: '25.50',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    window.history.pushState({}, '', '/send');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  async function waitForConfirmationToSettle() {
    await waitFor(
      () => {
        expect(
          screen.queryAllByRole('button', { name: /sending/i }),
        ).toHaveLength(0);
      },
      { timeout: 3000 },
    );
  }

  it.each([
    [
      'rejected connection',
      () => Promise.reject(new Error('User rejected the connection request')),
    ],
    ['incomplete connection', () => Promise.resolve(undefined)],
    [
      'insufficient newly connected balance',
      () => Promise.resolve({ ...account, balance: '25.49' }),
    ],
  ])(
    'refuses %s without creating a transfer or operation',
    async (_name, connect) => {
      const connectSpy = vi
        .spyOn(walletService, 'connectWallet')
        .mockImplementation(connect);
      const createSpy = vi.spyOn(api, 'createTransfer');
      const user = userEvent.setup();
      render(<App />);
      await fillValidForm(user, '25.50');
      await confirmCurrentForm(user);
      await waitForConfirmationToSettle();

      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).not.toHaveBeenCalled();
      expect(localStorage.getItem('remitflow.transfers')).toBeNull();
      expect(sessionStorage.getItem(RECOVERY_STORAGE_KEY)).toBeNull();
      expect(
        screen.queryByRole('dialog', { name: /transfer submitted/i }),
      ).toBeNull();
      expect(
        screen.queryByRole('dialog', { name: /confirm your transfer/i }),
      ).toBeNull();
      expect(
        screen.getByRole('button', { name: /review & send/i }),
      ).toBeEnabled();
      expect(
        screen.getByText(
          /wallet connection did not complete|amount exceeds your wallet balance/i,
        ),
      ).toBeInTheDocument();
    },
  );

  it('admits an exact fractional balance and records one succeeded intent', async () => {
    vi.spyOn(walletService, 'connectWallet').mockResolvedValue(account);
    const createSpy = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);
    await fillValidForm(user, '25.50');
    await confirmCurrentForm(user);
    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 3000 },
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].sendAmount).toBe('25.5');
    const stored = JSON.parse(localStorage.getItem('remitflow.transfers'));
    const created = stored.filter((transfer) => transfer.idempotencyKey);
    expect(created).toHaveLength(1);
    expect(getLatestRecoverableOperation()).toMatchObject({
      idempotencyKey: created[0].idempotencyKey,
      transferId: created[0].id,
      status: 'succeeded',
    });
  });

  it('preserves an unknown intent on wallet refusal and reuses its key on explicit retry', async () => {
    const quote = buildQuote('25.5', 'USD', 'NGN');
    const fingerprint = await idempotencyKeyFor(
      fingerprintTransferPayload({
        recipient: 'amina@example.com',
        from: 'USD',
        to: 'NGN',
        sendAmount: quote.sendAmount,
        receiveAmount: quote.receiveAmount,
        fee: quote.fee,
        rate: quote.rate,
      }),
    );
    const idempotencyKey = await idempotencyKeyFor(
      fingerprint,
      'wallet-refusal-control',
    );
    saveTransferOperation({ idempotencyKey, fingerprint, status: 'unknown' });
    const priorJournal = sessionStorage.getItem(RECOVERY_STORAGE_KEY);
    const connectSpy = vi
      .spyOn(walletService, 'connectWallet')
      .mockRejectedValueOnce(new Error('User rejected the connection request'))
      .mockResolvedValueOnce(account);
    const createSpy = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/transfer status is unknown/i);
    await fillValidForm(user, '25.50');
    await confirmCurrentForm(user);
    await waitForConfirmationToSettle();

    expect(createSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('remitflow.transfers')).toBeNull();
    expect(sessionStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(priorJournal);
    await confirmCurrentForm(user);
    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 3000 },
    );

    expect(connectSpy).toHaveBeenCalledTimes(2);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].idempotencyKey).toBe(idempotencyKey);
    const stored = JSON.parse(localStorage.getItem('remitflow.transfers'));
    expect(stored.filter((transfer) => transfer.idempotencyKey)).toHaveLength(
      1,
    );
    expect(getLatestRecoverableOperation()).toMatchObject({
      idempotencyKey,
      status: 'succeeded',
    });
  });
});
