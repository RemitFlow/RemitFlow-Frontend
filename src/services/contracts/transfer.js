// Versioned contract for a transfer record.
//
// v1 is the shape RemitFlow's UI renders. Anything reaching the app through
// `parseTransfer` has already been checked field by field, so the receipt
// screens can render without defensive coercion.

import {
  ContractViolationError,
  defineContract,
  formatIssues,
  parseOrThrow,
  validate,
} from './schema.js';

export const TRANSFER_CONTRACT_VERSION = 1;

/**
 * The transfer lifecycle, in order. `completed` is the settled terminal state;
 * it keeps its historical name because it is what the UI, the URL query string
 * (`?status=completed`) and every stored record already use.
 */
export const TRANSFER_STATUSES = [
  'quoted',
  'validating',
  'authorizing',
  'pending',
  'completed',
  'failed',
  'expired',
];

/**
 * Wire spellings accepted from a provider and normalised on the way in.
 * Adding an entry here is a compatibility fix; removing one is breaking.
 */
export const TRANSFER_STATUS_ALIASES = {
  settled: 'completed',
  succeeded: 'completed',
  success: 'completed',
  submitted: 'pending',
  processing: 'pending',
  validation_pending: 'validating',
  authorization_required: 'authorizing',
};

/** Statuses that will not change again. */
export const TERMINAL_STATUSES = ['completed', 'failed', 'expired'];

export const transferContract = defineContract({
  name: 'Transfer',
  version: TRANSFER_CONTRACT_VERSION,
  fields: {
    id: { type: 'string', required: true, minLength: 1 },
    recipient: { type: 'string', required: true, minLength: 1 },
    from: { type: 'currency', required: true },
    to: { type: 'currency', required: true },
    sendAmount: { type: 'decimal', required: true, min: 0 },
    receiveAmount: { type: 'decimal', required: true, min: 0 },
    status: {
      type: 'enum',
      required: true,
      values: TRANSFER_STATUSES,
      aliases: TRANSFER_STATUS_ALIASES,
    },
    createdAt: { type: 'timestamp', required: true },
    // Optional enrichment. Absent on legacy records, so never required.
    fee: { type: 'decimal', required: false, min: 0 },
    rate: { type: 'decimal', required: false, min: 0 },
    expiresAt: { type: 'timestamp', required: false },
    failureReason: { type: 'string', required: false, nullable: true },
  },
});

/**
 * Parse one transfer, throwing an actionable diff if it does not match v1.
 * @param {unknown} raw
 * @param {{source?: string}} [options]
 * @returns {object} normalised transfer (amounts are decimal strings)
 */
export function parseTransfer(raw, options = {}) {
  return parseOrThrow(transferContract, raw, options);
}

/**
 * Parse a list of transfers without letting one bad record hide the rest.
 *
 * A single corrupt row is a data problem: drop it and carry on. Every row
 * failing is a schema change: that is reported through `breaking` so callers
 * can surface it instead of rendering a convincing empty state.
 *
 * @param {unknown} raw - the response body
 * @param {{source?: string}} [options]
 * @returns {{transfers: object[], rejected: Array<{index: number, issues: object[], diff: string}>, breaking: boolean}}
 */
export function parseTransferList(raw, options = {}) {
  if (!Array.isArray(raw)) {
    throw new ContractViolationError(
      transferContract,
      [
        {
          path: '(root)',
          code: 'not_an_array',
          expected: 'array of Transfer',
          received: raw === null ? 'null' : typeof raw,
        },
      ],
      options,
    );
  }

  const transfers = [];
  const rejected = [];

  raw.forEach((item, index) => {
    const outcome = validate(transferContract, item);
    if (outcome.ok) {
      transfers.push(outcome.value);
      return;
    }
    rejected.push({
      index,
      issues: outcome.issues,
      diff: formatIssues(transferContract, outcome.issues, {
        source: `${options.source ?? 'response'}[${index}]`,
      }),
    });
  });

  return {
    transfers,
    rejected,
    breaking: raw.length > 0 && transfers.length === 0,
  };
}

/**
 * Normalise a status string the way the contract does, for callers that hold
 * a bare status (a URL query parameter, a filter dropdown) rather than a
 * whole record.
 * @param {string} status
 * @returns {string|null} canonical status, or null if unrecognised
 */
export function normalizeStatus(status) {
  if (typeof status !== 'string') return null;
  if (TRANSFER_STATUSES.includes(status)) return status;
  return TRANSFER_STATUS_ALIASES[status] ?? null;
}

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(normalizeStatus(status));
}
