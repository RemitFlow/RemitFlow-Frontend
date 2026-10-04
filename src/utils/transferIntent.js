/**
 * Transfer intent fingerprint + session-scoped operation reference.
 *
 * One user intent maps to one idempotency key bound to the exact payload.
 * Editing the payload produces a new fingerprint and therefore a new intent.
 * Only a safe operation reference (key + status + transfer id) is persisted
 * across navigation/refresh — never secrets or raw form state.
 */

import { parseDecimal } from './money.js';

const OPS_KEY = 'remitflow.transferOps';
let nonceSequence = 0;

/** @typedef {'submitting'|'unknown'|'succeeded'|'failed'|'dismissed'} OpStatus */

/** A pre-submit recovery reference could not be read or saved safely. */
export class TransferOperationStorageError extends Error {
  constructor() {
    super('Transfer recovery information is unavailable.');
    this.name = 'TransferOperationStorageError';
  }
}

/** Old 32-bit fingerprints cannot safely bind a new request to a saved intent. */
export class LegacyTransferOperationError extends Error {
  constructor() {
    super(
      'A transfer from an older browser session needs reconciliation. Check Transfers before starting another transfer. This attempt was not submitted.',
    );
    this.name = 'LegacyTransferOperationError';
  }
}

/**
 * Canonical fingerprint of the transferable payload fields.
 * @param {{recipient:string,from:string,to:string,sendAmount:number|string,receiveAmount:number|string,fee?:number|string,rate?:number|string}} payload
 */
export function fingerprintTransferPayload(payload) {
  const parts = [
    String(payload.recipient ?? ''),
    String(payload.from ?? '').toUpperCase(),
    String(payload.to ?? '').toUpperCase(),
    normalizeAmount(payload.sendAmount),
    normalizeAmount(payload.receiveAmount),
    normalizeAmount(payload.fee),
    normalizeAmount(payload.rate),
  ];
  return JSON.stringify(parts);
}

function normalizeAmount(value) {
  if (value === undefined || value === null || value === '') return '';
  const parsed = parseDecimal(value);
  return parsed.ok ? parsed.value : String(value);
}

/**
 * Unique nonce for a new user intent. Retries reuse the saved key instead.
 */
export function newTransferIntentNonce() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return [...bytes]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return `${Date.now().toString(36)}:${++nonceSequence}:${Math.random().toString(36).slice(2)}`;
}

/**
 * Hash a payload fingerprint. A fresh nonce makes a new transfer key;
 * a retry reuses the key saved with its operation reference.
 * @param {string} fingerprint
 * @param {string} [nonce]
 */
export async function idempotencyKeyFor(fingerprint, nonce) {
  const input =
    nonce === undefined ? fingerprint : JSON.stringify([fingerprint, nonce]);
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hex = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `idem_${hex.slice(0, 32)}`;
  }
  // Use the SDK's existing SHA-256 implementation when SubtleCrypto is absent.
  // Both paths hash UTF-8 bytes and retain the same 128-bit key representation.
  const { hash } = await import('@stellar/stellar-sdk');
  return `idem_${hash(input).toString('hex').slice(0, 32)}`;
}

function readOps({ strict = false } = {}) {
  try {
    const raw = sessionStorage.getItem(OPS_KEY);
    if (raw === null || (!strict && !raw)) return {};
    const parsed = JSON.parse(raw);
    if (
      strict &&
      (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    ) {
      throw new TransferOperationStorageError();
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    if (strict) throw new TransferOperationStorageError();
    return {};
  }
}

function writeOps(ops, { strict = false } = {}) {
  try {
    sessionStorage.setItem(OPS_KEY, JSON.stringify(ops));
  } catch {
    if (strict) throw new TransferOperationStorageError();
    // Status updates after submission remain best-effort.
  }
}

/**
 * Persist a safe operation reference for navigation/refresh recovery.
 * @param {{idempotencyKey:string,fingerprint:string,transferId?:string|null,status:OpStatus}} op
 * @param {{strict?:boolean}} [options] Require successful persistence before submission.
 */
export function saveTransferOperation(op, options) {
  if (!op?.idempotencyKey) return;
  const ops = readOps(options);
  ops[op.idempotencyKey] = {
    idempotencyKey: op.idempotencyKey,
    fingerprint: op.fingerprint,
    transferId: op.transferId ?? null,
    status: op.status,
    updatedAt: new Date().toISOString(),
  };
  writeOps(ops, options);
}

/** @param {string} idempotencyKey */
export function getTransferOperation(idempotencyKey) {
  if (!idempotencyKey) return null;
  return readOps()[idempotencyKey] ?? null;
}

/**
 * Latest recoverable intent: in-flight, unknown outcome, or succeeded but not
 * yet dismissed. Used after navigation/refresh to restore status without
 * minting a second transfer.
 * @param {string} [fingerprint]
 * @param {{strict?:boolean}} [options] Refuse to choose a new key from unreadable state.
 */
export function getLatestRecoverableOperation(fingerprint, options) {
  const recoverable = new Set(['submitting', 'unknown', 'succeeded']);
  const ops = Object.values(readOps(options));
  const matches = ops
    .filter(
      (op) =>
        op &&
        recoverable.has(op.status) &&
        (fingerprint === undefined || op.fingerprint === fingerprint),
    )
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const match = matches[0] ?? null;
  const legacy = (op) => /^idem_[0-9a-f]{8}$/.test(op?.fingerprint ?? '');
  if (
    options?.strict &&
    (!match || legacy(match)) &&
    ops.some((op) => op && recoverable.has(op.status) && legacy(op))
  ) {
    // Do not mint a replacement key or guess which payload an old collision
    // represented. Default reads still permit reconciliation by the saved key.
    // A separately saved strong match can still be retried without a new key.
    throw new LegacyTransferOperationError();
  }
  return match;
}

export function clearTransferOperation(idempotencyKey) {
  if (!idempotencyKey) return;
  const ops = readOps();
  delete ops[idempotencyKey];
  writeOps(ops);
}
