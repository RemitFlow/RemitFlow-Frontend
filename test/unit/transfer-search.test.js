import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RESULT_CAP,
  MAX_RESULT_CAP,
  applyTransferSearch,
  isVisibleToActor,
  matchesTransferFilters,
  normalizeTransferQuery,
  requireActorId,
  stableSortTransfers,
  transferQueryScopeKey,
} from '../../src/utils/transferSearch.js';

const ACTOR = 'GACTOR_A';
const OTHER = 'GACTOR_B';
const LEGACY = 'GLEGACY';

function tx(overrides) {
  return {
    id: 'tx_1',
    recipient: 'amina@example.com',
    from: 'USD',
    to: 'NGN',
    sendAmount: '100',
    receiveAmount: '1000',
    status: 'completed',
    createdAt: '2026-06-01T12:00:00Z',
    actorId: ACTOR,
    ...overrides,
  };
}

describe('transferSearch scope and filters', () => {
  it('requires a non-empty actorId on every query', () => {
    expect(() => requireActorId('')).toThrow(/actorId is required/i);
    expect(() => requireActorId(null)).toThrow(/actorId is required/i);
    expect(requireActorId('  GXYZ  ')).toBe('GXYZ');
  });

  it('hides another actor’s transfers and migrates legacy rows safely', () => {
    expect(isVisibleToActor(tx({ actorId: ACTOR }), ACTOR)).toBe(true);
    expect(isVisibleToActor(tx({ actorId: OTHER }), ACTOR)).toBe(false);
    expect(
      isVisibleToActor(tx({ actorId: undefined }), LEGACY, {
        legacyActorId: LEGACY,
      }),
    ).toBe(true);
    expect(
      isVisibleToActor(tx({ actorId: undefined }), ACTOR, {
        legacyActorId: LEGACY,
      }),
    ).toBe(false);
  });

  it('matches status aliases, recipient search, and date range', () => {
    const row = tx({ status: 'settled', createdAt: '2026-06-04T00:00:00Z' });
    const now = new Date('2026-06-05T12:00:00Z');
    expect(matchesTransferFilters(row, { status: 'completed' }, now)).toBe(
      true,
    );
    expect(matchesTransferFilters(row, { search: 'AMINA' }, now)).toBe(true);
    expect(matchesTransferFilters(row, { search: 'nope' }, now)).toBe(false);
    expect(matchesTransferFilters(row, { range: '7d' }, now)).toBe(true);
    expect(
      matchesTransferFilters(
        tx({ createdAt: '2026-01-01T00:00:00Z' }),
        { range: '7d' },
        now,
      ),
    ).toBe(false);
  });

  it('stable-sorts by createdAt desc with id as tie-breaker', () => {
    const rows = [
      tx({ id: 'tx_a', createdAt: '2026-06-01T00:00:00Z' }),
      tx({ id: 'tx_c', createdAt: '2026-06-02T00:00:00Z' }),
      tx({ id: 'tx_b', createdAt: '2026-06-02T00:00:00Z' }),
    ];
    expect(stableSortTransfers(rows).map((r) => r.id)).toEqual([
      'tx_c',
      'tx_b',
      'tx_a',
    ]);
  });

  it('stabilizes capped membership for canonically equivalent IDs', () => {
    const rows = [tx({ id: 'tx_\u00e9' }), tx({ id: 'tx_e\u0301' })];
    const query = { actorId: ACTOR, limit: 1 };
    const forward = applyTransferSearch(rows, query);
    const reversed = applyTransferSearch([...rows].reverse(), query);

    expect(reversed.items).toEqual(forward.items);
    expect(forward.items.map((row) => row.id)).toEqual(['tx_\u00e9']);
    expect(forward.totalMatched).toBe(2);
    expect(reversed.totalMatched).toBe(2);
    expect(forward.capped).toBe(true);
    expect(reversed.capped).toBe(true);
  });

  it('caps results and reports totalMatched for large histories', () => {
    const rows = Array.from({ length: 250 }, (_, i) =>
      tx({
        id: `tx_${String(i).padStart(4, '0')}`,
        createdAt: new Date(Date.UTC(2026, 5, 1, 0, 0, i)).toISOString(),
      }),
    );
    const result = applyTransferSearch(
      rows,
      { actorId: ACTOR, limit: 50 },
      { legacyActorId: LEGACY },
    );
    expect(result.items).toHaveLength(50);
    expect(result.totalMatched).toBe(250);
    expect(result.capped).toBe(true);
    expect(result.items[0].id > result.items[49].id).toBe(true);
  });

  it('keeps the same capped rows as stable sorting across filters and duplicate keys', () => {
    const rows = Object.freeze(
      Array.from({ length: 850 }, (_, i) =>
        Object.freeze(
          tx({
            id: `tx_${i % 11}`,
            actorId: i % 4 === 0 ? OTHER : ACTOR,
            recipient: i % 3 === 0 ? 'amina@example.com' : 'other@example.com',
            status: i % 2 === 0 ? 'settled' : 'pending',
            createdAt: new Date(Date.UTC(2026, 5, 1 + (i % 7))).toISOString(),
            originalRow: i,
          }),
        ),
      ),
    );
    const now = new Date('2026-06-08T12:00:00Z');
    const queries = [
      ...[1, 7, 100, 500, 9999].map((limit) => ({ actorId: ACTOR, limit })),
      {
        actorId: ACTOR,
        search: ' AMINA ',
        status: 'completed',
        range: '7d',
        limit: 7,
      },
      { actorId: OTHER, status: 'pending', limit: 1 },
      { actorId: ACTOR, search: 'absent', limit: 100 },
    ];
    for (const query of queries) {
      const normalized = normalizeTransferQuery(query);
      const matched = rows.filter(
        (row) =>
          isVisibleToActor(row, normalized.actorId) &&
          matchesTransferFilters(row, normalized, now),
      );
      const expected = stableSortTransfers(matched).slice(0, normalized.limit);
      const result = applyTransferSearch(rows, query, { now });
      expect(result).toEqual({
        items: expected,
        totalMatched: matched.length,
        capped: matched.length > normalized.limit,
        scopeKey: transferQueryScopeKey(normalized),
      });
      result.items.forEach((row, i) => expect(row).toBe(expected[i]));
    }
  });

  it('preserves zero-time ordering, Unicode ties and sparse legacy histories', () => {
    const rows = new Array(12);
    rows[1] = tx({ id: 'tx_\u00e9', actorId: undefined, createdAt: 'invalid' });
    rows[3] = tx({
      id: 'tx_e\u0301',
      actorId: undefined,
      createdAt: undefined,
    });
    rows[4] = tx({
      id: 'tx_z',
      actorId: undefined,
      createdAt: '1970-01-01T00:00:00Z',
    });
    rows[5] = tx({
      id: 'tx_z',
      actorId: undefined,
      createdAt: 'invalid',
      sendAmount: '200',
    });
    rows[7] = tx({
      id: 'tx_z',
      actorId: undefined,
      createdAt: '1969-12-31T00:00:00Z',
    });
    rows[9] = tx({ id: 'tx_new', actorId: OTHER });
    for (const limit of [1, 3, 4, 100]) {
      const query = { actorId: LEGACY, limit };
      const options = { legacyActorId: LEGACY };
      const matched = rows.filter((row) =>
        isVisibleToActor(row, LEGACY, options),
      );
      const expected = stableSortTransfers(matched).slice(0, limit);
      const result = applyTransferSearch(rows, query, options);
      expect(result.items).toEqual(expected);
      expect(result.totalMatched).toBe(5);
      expect(result.capped).toBe(5 > limit);
      result.items.forEach((row, i) => expect(row).toBe(expected[i]));
    }
    expect(0 in rows).toBe(false);
    expect(rows).toHaveLength(12);
  });

  it('normalizes and clamps the query limit', () => {
    expect(normalizeTransferQuery({ actorId: ACTOR, limit: 9999 }).limit).toBe(
      MAX_RESULT_CAP,
    );
    expect(normalizeTransferQuery({ actorId: ACTOR }).limit).toBe(
      DEFAULT_RESULT_CAP,
    );
  });

  it('builds a stable scope key so stale responses can be detected', () => {
    const a = transferQueryScopeKey({
      actorId: ACTOR,
      search: 'amina',
      status: 'completed',
      range: '7d',
      limit: 100,
    });
    const b = transferQueryScopeKey({
      actorId: ACTOR,
      search: 'amina',
      status: 'completed',
      range: '7d',
      limit: 100,
    });
    const c = transferQueryScopeKey({
      actorId: ACTOR,
      search: 'other',
      status: 'completed',
      range: '7d',
      limit: 100,
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('filters at scale within a tight budget', () => {
    const rows = Array.from({ length: 5000 }, (_, i) =>
      tx({
        id: `tx_${i}`,
        actorId: i % 3 === 0 ? OTHER : ACTOR,
        recipient: i % 10 === 0 ? 'amina@example.com' : `user${i}@example.com`,
        status: i % 2 === 0 ? 'completed' : 'pending',
        createdAt: new Date(Date.UTC(2026, 0, 1 + (i % 150))).toISOString(),
      }),
    );
    const started = performance.now();
    const result = applyTransferSearch(
      rows,
      { actorId: ACTOR, search: 'amina', status: 'completed', limit: 100 },
      { now: new Date('2026-06-05T12:00:00Z'), legacyActorId: LEGACY },
    );
    const elapsed = performance.now() - started;
    expect(result.items.length).toBeLessThanOrEqual(100);
    expect(result.items.every((r) => r.actorId === ACTOR)).toBe(true);
    expect(elapsed).toBeLessThan(100);
  });
});
