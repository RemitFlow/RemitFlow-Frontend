import { describe, expect, it } from 'vitest';
import {
  SNAPSHOT_TTL_MS,
  createTransferSnapshot,
  decodeCursor,
  encodeCursor,
  filterScopeKey,
  isCursorInScope,
  pageFromSnapshot,
  resolveTransferPage,
  stableSortTransfers,
} from '../../src/utils/transferSnapshot.js';

const NOW = Date.parse('2026-09-24T19:00:00Z');

function tx(id, createdAt, extra = {}) {
  return {
    id,
    recipient: `${id}@example.com`,
    from: 'USD',
    to: 'NGN',
    sendAmount: '10.00',
    receiveAmount: '1000.00',
    status: 'completed',
    createdAt,
    ...extra,
  };
}

describe('transferSnapshot', () => {
  it('sorts by createdAt desc with id as tie-breaker', () => {
    const rows = [
      tx('tx_a', '2026-09-01T10:00:00Z'),
      tx('tx_b', '2026-09-01T10:00:00Z'),
      tx('tx_c', '2026-09-02T10:00:00Z'),
    ];
    expect(stableSortTransfers(rows).map((r) => r.id)).toEqual([
      'tx_c',
      'tx_b',
      'tx_a',
    ]);
  });

  it('keeps pages deterministic when new transfers arrive', () => {
    const initial = Array.from({ length: 12 }, (_, i) =>
      tx(
        `tx_${String(i).padStart(2, '0')}`,
        `2026-09-01T10:${String(i).padStart(2, '0')}:00Z`,
      ),
    );
    const snapshot = createTransferSnapshot(initial, {
      filters: { search: '', status: '', range: '' },
      now: NOW,
      pageSize: 5,
    });

    const page1 = pageFromSnapshot(snapshot, initial, {
      filters: { search: '', status: '', range: '' },
      now: NOW,
    });
    expect(page1.ok).toBe(true);
    expect(page1.items.map((t) => t.id)).toEqual([
      'tx_11',
      'tx_10',
      'tx_09',
      'tx_08',
      'tx_07',
    ]);

    // Concurrent insert of a newer transfer must not push into page 1 of this snapshot.
    const withInsert = [tx('tx_new', '2026-09-03T10:00:00Z'), ...initial];
    const page1Again = pageFromSnapshot(snapshot, withInsert, {
      cursor: page1.cursor,
      filters: { search: '', status: '', range: '' },
      now: NOW,
    });
    expect(page1Again.items.map((t) => t.id)).toEqual(
      page1.items.map((t) => t.id),
    );
    expect(page1Again.items.map((t) => t.id)).not.toContain('tx_new');

    const page2 = pageFromSnapshot(snapshot, withInsert, {
      cursor: page1.nextCursor,
      filters: { search: '', status: '', range: '' },
      now: NOW,
    });
    expect(page2.items.map((t) => t.id)).toEqual([
      'tx_06',
      'tx_05',
      'tx_04',
      'tx_03',
      'tx_02',
    ]);
  });

  it('keeps snapshot pages complete after a live row disappears and rejects a forged cursor', () => {
    const rows = Array.from({ length: 7 }, (_, i) =>
      tx(`tx_${i}`, `2026-09-01T10:0${i}:00Z`),
    );
    const filters = { search: '', status: '', range: '' };
    const snapshot = createTransferSnapshot(rows, {
      filters,
      now: NOW,
      pageSize: 5,
    });
    const first = pageFromSnapshot(snapshot, rows, { filters, now: NOW });
    const filtered = rows.filter((row) => row.id !== 'tx_1');
    const second = pageFromSnapshot(snapshot, filtered, {
      cursor: first.nextCursor,
      filters,
      now: NOW,
    });
    expect(second.ok).toBe(true);
    expect(second.items.map((row) => row.id)).toEqual(['tx_1', 'tx_0']);

    const forged = encodeCursor({
      snapshotId: snapshot.id,
      scope: snapshot.scope,
      page: 2,
      after: snapshot.items[0],
    });
    expect(
      pageFromSnapshot(snapshot, filtered, {
        cursor: forged,
        filters,
        now: NOW,
      }).code,
    ).toBe('cursor_expired');
  });

  it('rejects cursors outside the filter scope', () => {
    const rows = [tx('tx_1', '2026-09-01T10:00:00Z')];
    const snapshot = createTransferSnapshot(rows, {
      filters: { search: '', status: 'completed', range: '' },
      now: NOW,
    });
    const cursor = encodeCursor({
      snapshotId: snapshot.id,
      scope: snapshot.scope,
      page: 1,
      after: null,
    });
    const decoded = decodeCursor(cursor);
    expect(
      isCursorInScope(
        decoded,
        snapshot,
        { search: '', status: 'pending', range: '' },
        NOW,
      ),
    ).toBe(false);
    expect(
      isCursorInScope(
        decoded,
        snapshot,
        { search: '', status: 'completed', range: '' },
        NOW,
      ),
    ).toBe(true);
  });

  it('recovers from an expired snapshot cursor', () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      tx(`tx_${i}`, `2026-09-01T10:0${i}:00Z`),
    );
    const snapshot = createTransferSnapshot(rows, {
      filters: { search: '', status: '', range: '' },
      now: NOW,
      pageSize: 5,
    });
    const staleCursor = encodeCursor({
      snapshotId: snapshot.id,
      scope: snapshot.scope,
      page: 2,
      after: snapshot.items[4],
    });

    const resolved = resolveTransferPage(rows, {
      filters: { search: '', status: '', range: '' },
      cursor: staleCursor,
      snapshot,
      pageSize: 5,
      now: NOW + SNAPSHOT_TTL_MS + 1,
    });

    expect(resolved.recovered).toBe(true);
    expect(resolved.page.page).toBe(1);
    expect(resolved.snapshot.id).not.toBe(snapshot.id);
    expect(resolved.page.items).toHaveLength(5);
  });

  it('resets to a new snapshot when filters change', () => {
    const rows = [
      tx('tx_1', '2026-09-01T10:00:00Z', { status: 'completed' }),
      tx('tx_2', '2026-09-01T11:00:00Z', { status: 'pending' }),
    ];
    const first = resolveTransferPage(rows, {
      filters: { search: '', status: '', range: '' },
      now: NOW,
      pageSize: 5,
    });
    const second = resolveTransferPage(
      rows.filter((t) => t.status === 'pending'),
      {
        filters: { search: '', status: 'pending', range: '' },
        cursor: first.page.cursor,
        snapshot: first.snapshot,
        now: NOW,
        pageSize: 5,
      },
    );
    expect(second.snapshot.scope).toBe(
      filterScopeKey({ search: '', status: 'pending', range: '' }),
    );
    expect(second.snapshot.id).not.toBe(first.snapshot.id);
    expect(second.page.items.map((t) => t.id)).toEqual(['tx_2']);
  });

  it('pages a large fixture without gaps inside the snapshot', () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      tx(
        `tx_${String(i).padStart(3, '0')}`,
        `2026-08-01T${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
      ),
    );
    let state = resolveTransferPage(rows, {
      filters: { search: '', status: '', range: '' },
      now: NOW,
      pageSize: 5,
    });
    const seen = new Set(state.page.items.map((t) => t.id));
    while (state.page.nextCursor) {
      state = resolveTransferPage(rows, {
        filters: { search: '', status: '', range: '' },
        cursor: state.page.nextCursor,
        snapshot: state.snapshot,
        now: NOW,
        pageSize: 5,
      });
      for (const item of state.page.items) {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
      }
    }
    expect(seen.size).toBe(50);
  });

  it('rebuilds when an empty loading snapshot later receives rows', () => {
    const empty = resolveTransferPage([], {
      filters: { search: '', status: '', range: '' },
      now: NOW,
      pageSize: 5,
    });
    expect(empty.snapshot.items).toHaveLength(0);

    const rows = [tx('tx_1', '2026-09-01T10:00:00Z')];
    const filled = resolveTransferPage(rows, {
      filters: { search: '', status: '', range: '' },
      snapshot: empty.snapshot,
      now: NOW,
      pageSize: 5,
    });
    expect(filled.snapshot.items).toHaveLength(1);
    expect(filled.page.items.map((t) => t.id)).toEqual(['tx_1']);
  });

  it('refreshes live fields without replacing membership when a row stops matching the filter', () => {
    const initial = [
      tx('tx_1', '2026-09-01T10:00:00Z', { status: 'pending' }),
      tx('tx_2', '2026-09-01T11:00:00Z', { status: 'pending' }),
    ];
    const filters = { search: '', status: 'pending', range: '' };
    const first = resolveTransferPage(initial, { filters, now: NOW });
    const liveTransfers = [
      { ...initial[0], status: 'completed' },
      initial[1],
      tx('tx_new', '2026-09-02T10:00:00Z', { status: 'pending' }),
    ];

    const refreshed = resolveTransferPage(
      liveTransfers.filter((row) => row.status === 'pending'),
      {
        filters,
        liveTransfers,
        cursor: first.page.cursor,
        snapshot: first.snapshot,
        now: NOW + 1000,
      },
    );

    expect(refreshed.snapshot.id).toBe(first.snapshot.id);
    expect(refreshed.page.items.map((row) => row.id)).toEqual(['tx_2', 'tx_1']);
    expect(refreshed.page.items[1].status).toBe('completed');
    expect(refreshed.page.totalCount).toBe(2);
  });

  it('rejects a cursor from a same-time, equal-sized replacement snapshot', () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      tx(
        `tx_${String(i).padStart(2, '0')}`,
        `2026-09-01T10:${String(i).padStart(2, '0')}:00Z`,
      ),
    );
    const first = createTransferSnapshot(rows, { now: NOW, pageSize: 5 });
    const firstPage = pageFromSnapshot(first, rows, { now: NOW });
    const changed = [
      tx('tx_new', '2026-09-02T10:00:00Z'),
      ...rows.slice(0, 11),
    ];
    const replacement = createTransferSnapshot(changed, {
      now: NOW,
      pageSize: 5,
    });

    // The old page boundary is still present, so it cannot stand in for
    // generation identity when a different row changed before that boundary.
    expect(first.items[4]).toEqual(replacement.items[4]);
    expect(replacement.id).not.toBe(first.id);
    expect(
      pageFromSnapshot(replacement, changed, {
        now: NOW,
        cursor: firstPage.nextCursor,
      }).code,
    ).toBe('cursor_expired');

    // Even unchanged membership belongs to a new generation when recreated.
    expect(createTransferSnapshot(rows, { now: NOW }).id).not.toBe(first.id);
  });

  it('gives same-tick cursor recovery an identity the page can retain', () => {
    const rows = [tx('tx_a', '2026-09-01T10:00:00Z')];
    const first = resolveTransferPage(rows, { now: NOW });
    const changed = [tx('tx_b', '2026-09-02T10:00:00Z')];
    const recovered = resolveTransferPage(changed, {
      snapshot: first.snapshot,
      cursor: 'invalid',
      now: NOW,
    });
    expect(recovered.recovered).toBe(true);
    expect(recovered.snapshot.id).not.toBe(first.snapshot.id);

    // Transfers persists replacements by comparing their IDs. The next
    // cursor-free render must not return the superseded row.
    const retained =
      recovered.snapshot.id !== first.snapshot.id
        ? recovered.snapshot
        : first.snapshot;
    expect(
      resolveTransferPage(changed, {
        snapshot: retained,
        now: NOW,
      }).page.items.map((row) => row.id),
    ).toEqual(['tx_b']);
  });
});
