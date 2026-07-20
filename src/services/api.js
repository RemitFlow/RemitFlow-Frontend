// Mock API service for RemitFlow.
// Simulates a backend that stores and lists transfers. No real network calls.

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
  } catch (err) {
    // ignore parse/storage errors
  }
  return SEED_TRANSFERS;
}

function write(transfers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transfers));
  } catch (err) {
    // ignore
  }
}

/**
 * List all transfers, newest first.
 * @returns {Promise<Array>}
 */
export function listTransfers() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const transfers = read()
        .slice()
        .sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      resolve(transfers);
    }, 400);
  });
}

/**
 * Create a new transfer record.
 * @param {object} payload - transfer details
 * @returns {Promise<object>} the created transfer
 */
export function createTransfer(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const transfer = {
        id: 'tx_' + Date.now(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...payload,
      };
      const transfers = read();
      transfers.push(transfer);
      write(transfers);
      resolve(transfer);
    }, 700);
  });
}
