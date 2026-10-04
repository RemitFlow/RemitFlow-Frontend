import { createHash, webcrypto } from 'node:crypto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import * as api from '../../src/services/api.js';
import {
  fingerprintTransferPayload,
  getLatestRecoverableOperation,
  getTransferOperation,
  idempotencyKeyFor,
  LegacyTransferOperationError,
  saveTransferOperation,
} from '../../src/utils/transferIntent.js';

const STORAGE_KEY = 'remitflow.transferOps';
const legacyFingerprint = 'idem_489b5d95';
const recipients = [
  'recipient-103w456@example.com',
  'recipient-1p5osr6@example.com',
];
const payloadFor = (recipient) => ({
  recipient,
  from: 'USD',
  to: 'NGN',
  sendAmount: '25',
  receiveAmount: '36642.38',
  fee: '0.25',
  rate: '1480.5',
});
const strongKey = (value) =>
  `idem_${createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 32)}`;

// The removed fallback, retained here only to pin the real collision input.
function legacyKey(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `idem_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function withoutSubtleCrypto() {
  vi.stubGlobal('crypto', {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    randomUUID: webcrypto.randomUUID.bind(webcrypto),
  });
}

function saveLegacy(status = 'unknown', overrides = {}) {
  const operation = {
    idempotencyKey: 'idem_aabbccdd',
    fingerprint: legacyFingerprint,
    status,
    ...overrides,
  };
  saveTransferOperation(operation);
  return operation;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('crypto', webcrypto);
  sessionStorage.clear();
  localStorage.clear();
  window.history.pushState({}, '', '/send');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

describe('transfer fingerprint crypto compatibility', () => {
  it('uses identical UTF-8 SHA-256 keys with or without SubtleCrypto', async () => {
    const fingerprint = '["café@example.com","USD","NGN","25"]';
    const nonce = 'intent-☃';
    const expectedFingerprint = strongKey(fingerprint);
    const expectedIntent = strongKey(JSON.stringify([fingerprint, nonce]));
    expect(await idempotencyKeyFor(fingerprint)).toBe(expectedFingerprint);
    expect(await idempotencyKeyFor(fingerprint, nonce)).toBe(expectedIntent);
    withoutSubtleCrypto();
    expect(await idempotencyKeyFor(fingerprint)).toBe(expectedFingerprint);
    expect(await idempotencyKeyFor(fingerprint, nonce)).toBe(expectedIntent);
  });

  it('does not collapse the two valid recipients that collide under FNV-1a', async () => {
    withoutSubtleCrypto();
    const canonical = recipients.map((recipient) =>
      fingerprintTransferPayload(payloadFor(recipient)),
    );
    expect(canonical.map(legacyKey)).toEqual([
      legacyFingerprint,
      legacyFingerprint,
    ]);
    const fingerprints = await Promise.all(
      canonical.map((value) => idempotencyKeyFor(value)),
    );
    expect(fingerprints).toEqual([
      'idem_c1c4fbc87f8298fbaaa08f2abf483014',
      'idem_292b27e8347f595af102c42d966ae47c',
    ]);
    saveTransferOperation({
      idempotencyKey: 'idem_retained_exact_key',
      fingerprint: fingerprints[0],
      status: 'unknown',
    });
    expect(
      getLatestRecoverableOperation(fingerprints[1], { strict: true }),
    ).toBeNull();
    expect(
      getLatestRecoverableOperation(fingerprints[0], { strict: true })
        ?.idempotencyKey,
    ).toBe('idem_retained_exact_key');
  });

  it.each(['submitting', 'unknown', 'succeeded'])(
    'keeps an unresolved legacy %s record readable but refuses automatic rebinding',
    (status) => {
      const legacy = saveLegacy(status);
      const before = sessionStorage.getItem(STORAGE_KEY);
      expect(getLatestRecoverableOperation()).toMatchObject(legacy);
      expect(getTransferOperation(legacy.idempotencyKey)).toMatchObject(legacy);
      expect(() =>
        getLatestRecoverableOperation(legacyFingerprint, { strict: true }),
      ).toThrow(LegacyTransferOperationError);
      expect(() =>
        getLatestRecoverableOperation(strongKey('new details'), {
          strict: true,
        }),
      ).toThrow(LegacyTransferOperationError);
      expect(sessionStorage.getItem(STORAGE_KEY)).toBe(before);
    },
  );

  it('still retries an exact strong saved intent when another legacy intent is unresolved', () => {
    saveLegacy();
    const fingerprint = strongKey('known strong details');
    saveTransferOperation({
      idempotencyKey: 'idem_existing_strong_key',
      fingerprint,
      status: 'unknown',
    });
    expect(
      getLatestRecoverableOperation(fingerprint, { strict: true })
        ?.idempotencyKey,
    ).toBe('idem_existing_strong_key');
  });

  it.each(['failed', 'dismissed'])(
    'does not block a new intent on a legacy %s record',
    (status) => {
      saveLegacy(status);
      expect(
        getLatestRecoverableOperation(strongKey('new details'), {
          strict: true,
        }),
      ).toBeNull();
    },
  );
});

describe('SendMoney legacy recovery boundary', () => {
  it('refuses a new submission without changing an unresolved legacy key or journal', async () => {
    const legacy = saveLegacy();
    const before = sessionStorage.getItem(STORAGE_KEY);
    localStorage.setItem(
      'remitflow.wallet',
      JSON.stringify({
        publicKey: 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF',
        balance: 1000,
      }),
    );
    const create = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/transfer status is unknown/i);
    await user.type(await screen.findByLabelText(/recipient/i), recipients[0]);
    await user.type(screen.getByLabelText(/^amount$/i), '25');
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );
    expect(
      await screen.findByText(
        `⚠️ ${new LegacyTransferOperationError().message}`,
      ),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(before);
    expect(getTransferOperation(legacy.idempotencyKey)).toMatchObject(legacy);
  });

  it('reconciles an accepted legacy transfer by its original key without resubmitting', async () => {
    const legacy = saveLegacy();
    const accepted = await api.createTransfer({
      ...payloadFor(recipients[0]),
      idempotencyKey: legacy.idempotencyKey,
    });
    const create = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);
    const dialog = await screen.findByRole('dialog', {
      name: /transfer submitted/i,
    });
    expect(within(dialog).getByText(recipients[0])).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    expect(getTransferOperation(legacy.idempotencyKey)).toMatchObject({
      idempotencyKey: legacy.idempotencyKey,
      fingerprint: legacyFingerprint,
      transferId: accepted.id,
      status: 'succeeded',
    });
    await user.click(within(dialog).getByRole('button', { name: /^close$/i }));
    expect(getTransferOperation(legacy.idempotencyKey)?.status).toBe(
      'dismissed',
    );
    expect(
      getLatestRecoverableOperation(strongKey('new intent'), { strict: true }),
    ).toBeNull();
  });
});
