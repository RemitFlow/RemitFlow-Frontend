import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_FIXTURE_VERSIONS,
  loadBreakingFixtures,
  loadFixture,
  loadTransferFixtures,
} from '../fixtures/index.js';
import {
  TRANSFER_CONTRACT_VERSION,
  TRANSFER_STATUSES,
  TRANSFER_STATUS_ALIASES,
  isTerminalStatus,
  normalizeStatus,
  parseTransfer,
  parseTransferList,
  transferContract,
} from '../../src/services/contracts/transfer.js';
import { ContractViolationError } from '../../src/services/contracts/schema.js';
import { parseDecimal } from '../../src/utils/money.js';

describe('fixture set', () => {
  it('records a fixture set for the current contract version', () => {
    expect(SUPPORTED_FIXTURE_VERSIONS).toContain(TRANSFER_CONTRACT_VERSION);
  });

  it('covers every lifecycle state the contract declares', () => {
    const covered = new Set(
      loadTransferFixtures(TRANSFER_CONTRACT_VERSION).map(({ payload }) =>
        normalizeStatus(payload.status),
      ),
    );
    // Fails the moment a state is added to the contract without a fixture.
    expect([...covered].sort()).toEqual([...TRANSFER_STATUSES].sort());
  });
});

describe('parseTransfer — v1 fixtures', () => {
  const fixtures = loadTransferFixtures(TRANSFER_CONTRACT_VERSION);

  it.each(fixtures.map(({ name }) => name))('%s parses', (name) => {
    expect(() =>
      parseTransfer(loadFixture(TRANSFER_CONTRACT_VERSION, name)),
    ).not.toThrow();
  });

  it.each(fixtures.map(({ name }) => name))(
    '%s yields amounts that are exact decimals, never NaN',
    (name) => {
      const transfer = parseTransfer(
        loadFixture(TRANSFER_CONTRACT_VERSION, name),
      );
      for (const field of ['sendAmount', 'receiveAmount']) {
        expect(parseDecimal(transfer[field]).ok).toBe(true);
        expect(Number.isNaN(Number(transfer[field]))).toBe(false);
      }
    },
  );

  it('normalises numeric and string amounts to the same value', () => {
    const legacy = parseTransfer(
      loadFixture(TRANSFER_CONTRACT_VERSION, 'transfer.completed-legacy'),
    );
    // The legacy fixture carries JSON numbers; the modern ones carry strings.
    expect(legacy.sendAmount).toBe('200');
    expect(legacy.receiveAmount).toBe('294620');
  });

  it('normalises the "settled" wire spelling to the canonical status', () => {
    const settled = parseTransfer(
      loadFixture(TRANSFER_CONTRACT_VERSION, 'transfer.settled'),
    );
    expect(settled.status).toBe('completed');
  });

  it('preserves fields a newer provider has added', () => {
    const forward = parseTransfer(
      loadFixture(TRANSFER_CONTRACT_VERSION, 'transfer.forward-compatible'),
    );
    // Additive changes must not break a released client.
    expect(forward.settlementNetwork).toBe('stellar');
    expect(forward.status).toBe('pending');
  });

  it('keeps an explicit null in a nullable field', () => {
    const expired = parseTransfer(
      loadFixture(TRANSFER_CONTRACT_VERSION, 'transfer.expired'),
    );
    expect(expired.failureReason).toBeNull();
    expect(expired.expiresAt).toBe('2026-08-01T12:01:00Z');
  });
});

describe('breaking response changes', () => {
  const breaking = loadBreakingFixtures(TRANSFER_CONTRACT_VERSION).filter(
    ({ name }) => name.startsWith('transfer.'),
  );

  it.each(breaking.map(({ name }) => name))('%s is rejected', (name) => {
    const payload = loadFixture(TRANSFER_CONTRACT_VERSION, name, {
      kind: 'breaking',
    });
    expect(() => parseTransfer(payload)).toThrow(ContractViolationError);
  });

  // The point of the contract is not that it fails, but that the failure says
  // what to do. Each entry pins the field and the code the diff must name.
  const EXPECTED = {
    'transfer.renamed-amount': { path: 'sendAmount', code: 'renamed_field' },
    'transfer.money-object-amount': {
      path: 'sendAmount',
      code: 'wrong_type',
    },
    'transfer.unknown-status': { path: 'status', code: 'invalid_enum' },
    'transfer.null-amount': { path: 'sendAmount', code: 'missing_field' },
    'transfer.epoch-timestamp': { path: 'createdAt', code: 'wrong_type' },
    'transfer.non-iso-currency': { path: 'from', code: 'wrong_type' },
  };

  it('has an expectation recorded for every breaking fixture', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(
      breaking.map(({ name }) => name).sort(),
    );
  });

  it.each(Object.entries(EXPECTED))(
    '%s names the offending field in the diff',
    (name, expected) => {
      const payload = loadFixture(TRANSFER_CONTRACT_VERSION, name, {
        kind: 'breaking',
      });
      let error;
      try {
        parseTransfer(payload, { source: 'fixture' });
      } catch (thrown) {
        error = thrown;
      }

      expect(error).toBeInstanceOf(ContractViolationError);
      expect(error.contract).toBe(transferContract.id);
      expect(error.issues).toContainEqual(
        expect.objectContaining({ path: expected.path, code: expected.code }),
      );

      // Actionable: the message names the contract, the field, what was
      // expected, what arrived, and where to fix it.
      expect(error.message).toContain('Transfer v1');
      expect(error.message).toContain(expected.path);
      expect(error.message).toMatch(/expected .+, received .+/);
      expect(error.message).toContain('test/fixtures/v1/');
    },
  );

  it('suggests the rename rather than reporting an unrelated missing field', () => {
    const payload = loadFixture(
      TRANSFER_CONTRACT_VERSION,
      'transfer.renamed-amount',
      { kind: 'breaking' },
    );
    let message = '';
    try {
      parseTransfer(payload);
    } catch (error) {
      message = error.message;
    }
    expect(message).toContain('send_amount');
    expect(message).toContain('looks like a renamed "sendAmount"');
  });

  it('lists an unknown status alongside the statuses it does support', () => {
    const payload = loadFixture(
      TRANSFER_CONTRACT_VERSION,
      'transfer.unknown-status',
      { kind: 'breaking' },
    );
    let message = '';
    try {
      parseTransfer(payload);
    } catch (error) {
      message = error.message;
    }
    expect(message).toContain('in_flight');
    for (const status of TRANSFER_STATUSES) {
      expect(message).toContain(status);
    }
  });
});

describe('parseTransferList', () => {
  const valid = (status, id) => ({
    ...loadFixture(TRANSFER_CONTRACT_VERSION, 'transfer.pending'),
    id,
    status,
  });

  it('keeps the good rows when one row is corrupt', () => {
    const corrupt = loadFixture(
      TRANSFER_CONTRACT_VERSION,
      'transfer.null-amount',
      { kind: 'breaking' },
    );
    const result = parseTransferList(
      [valid('pending', 'a'), corrupt, valid('completed', 'b')],
      { source: 'listTransfers' },
    );

    expect(result.transfers.map((t) => t.id)).toEqual(['a', 'b']);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].index).toBe(1);
    expect(result.rejected[0].diff).toContain('listTransfers[1]');
    expect(result.breaking).toBe(false);
  });

  it('flags a whole-response schema change rather than an empty list', () => {
    const corrupt = loadFixture(
      TRANSFER_CONTRACT_VERSION,
      'transfer.renamed-amount',
      { kind: 'breaking' },
    );
    const result = parseTransferList([corrupt, { ...corrupt, id: 'tx_2' }]);
    expect(result.transfers).toEqual([]);
    expect(result.breaking).toBe(true);
  });

  it('does not call a genuinely empty response a schema change', () => {
    expect(parseTransferList([])).toMatchObject({
      transfers: [],
      breaking: false,
    });
  });

  it('rejects a response that is not a list at all', () => {
    expect(() => parseTransferList({ data: [] })).toThrow(
      ContractViolationError,
    );
    expect(() => parseTransferList(null)).toThrow(/expected array of Transfer/);
  });
});

describe('status helpers', () => {
  it('passes canonical statuses through unchanged', () => {
    for (const status of TRANSFER_STATUSES) {
      expect(normalizeStatus(status)).toBe(status);
    }
  });

  it('maps every declared alias onto a canonical status', () => {
    for (const [alias, canonical] of Object.entries(TRANSFER_STATUS_ALIASES)) {
      expect(TRANSFER_STATUSES).toContain(canonical);
      expect(normalizeStatus(alias)).toBe(canonical);
    }
  });

  it('returns null for a status it does not recognise', () => {
    expect(normalizeStatus('in_flight')).toBeNull();
    expect(normalizeStatus(undefined)).toBeNull();
    expect(normalizeStatus(42)).toBeNull();
  });

  it('identifies terminal states', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('settled')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('expired')).toBe(true);
    expect(isTerminalStatus('pending')).toBe(false);
    expect(isTerminalStatus('quoted')).toBe(false);
  });
});
