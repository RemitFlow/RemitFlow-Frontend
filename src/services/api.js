// Mock API service for RemitFlow.
// Simulates a backend that stores and lists transfers. No real network calls.
//
// Every record crossing this boundary is validated against the versioned
// Transfer contract. Nothing downstream — hooks, pages, receipt rows — has to
// guess whether a field is present or whether an amount is really a number.

import { ContractViolationError } from './contracts/schema.js';
import {
  parseTransfer,
  parseTransferList,
  transferContract,
} from './contracts/transfer.js';

const STORAGE_KEY = 'remitflow.transfers';

// Seed data shown the first time the app loads.
const SEED_TRANSFERS = [
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

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse/storage errors
  }
  return SEED_TRANSFERS;
}

function write(transfers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transfers));
  } catch {
    // ignore
  }
}

/**
 * Report records that failed the contract. A dropped row is worth a loud log
 * line: it is data the user paid for and is not seeing.
 * @param {Array<{diff: string}>} rejected
 */
function reportRejected(rejected) {
  for (const entry of rejected) {
    console.error(entry.diff);
  }
}

/**
 * List all transfers, newest first.
 *
 * One malformed record is dropped and logged so the rest of the list still
 * renders. A response where *every* record fails is a schema change, not bad
 * data, and is raised so the UI can say so instead of showing "no transfers".
 *
 * @returns {Promise<Array>} contract-normalised transfers
 */
export function listTransfers() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const { transfers, rejected, breaking } = parseTransferList(read(), {
          source: 'listTransfers',
        });
        if (breaking) {
          // Every row failed: raise one aggregate error carrying all the
          // issues. Reporting each row here as well would log the same diff
          // twice, since the caller logs whatever it catches.
          throw new ContractViolationError(
            transferContract,
            rejected.flatMap((entry) => entry.issues),
            { source: 'listTransfers' },
          );
        }
        if (rejected.length) reportRejected(rejected);
        resolve(
          transfers
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        );
      } catch (error) {
        reject(error);
      }
    }, 400);
  });
}

/**
 * Create a new transfer record.
 *
 * The assembled record is validated before it is persisted, so a drifted
 * payload fails at submission with an actionable diff instead of writing a
 * record that later renders as a plausible-looking wrong number.
 *
 * @param {object} payload - transfer details
 * @returns {Promise<object>} the created transfer
 */
export function createTransfer(payload) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const transfer = parseTransfer(
          {
            id: 'tx_' + Date.now(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            ...payload,
          },
          { source: 'createTransfer' },
        );
        const existing = read();
        const transfers = Array.isArray(existing) ? existing : [];
        transfers.push(transfer);
        write(transfers);
        resolve(transfer);
      } catch (error) {
        reject(error);
      }
    }, 700);
  });
}
