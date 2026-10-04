import { describe, expect, it } from 'vitest';
import { applyTransferSearch } from '../../src/utils/transferSearch.js';

const rows = Object.freeze(
  Array.from({ length: 40 }, (_, index) =>
    Object.freeze({
      id: String(index),
      actorId: 'demo',
      recipient: 'Alice',
      status: 'settled',
      createdAt: '2026-09-27T12:00:00.000Z',
    }),
  ),
);

describe('transfer filter preparation', () => {
  it('prepares the date window once per query instead of once per row', () => {
    const now = new Date('2026-10-04T12:00:00.000Z');
    const instant = now.getTime();
    let clockReads = 0;
    now.getTime = () => {
      clockReads += 1;
      return instant;
    };
    const result = applyTransferSearch(
      rows,
      { actorId: 'demo', search: ' ALICE ', status: 'success', range: '7d' },
      { now },
    );
    expect(result.totalMatched).toBe(40);
    expect(result.items).toHaveLength(40);
    expect(clockReads).toBe(1);
  });

  it('refreshes the window for each query and preserves empty and invalid windows', () => {
    const now = new Date('2026-10-04T12:00:00.000Z');
    const query = { actorId: 'demo', range: '7d' };
    expect(applyTransferSearch(rows, query, { now }).totalMatched).toBe(40);
    now.setTime(now.getTime() + 1);
    expect(applyTransferSearch(rows, query, { now }).totalMatched).toBe(0);
    for (const range of ['', '0d', 'unknown']) {
      expect(
        applyTransferSearch(rows, { ...query, range }, { now }).totalMatched,
      ).toBe(40);
    }
    for (const range of ['99999999999999999d', `${'9'.repeat(400)}d`]) {
      expect(
        applyTransferSearch(rows, { ...query, range }, { now }).totalMatched,
      ).toBe(0);
    }
    expect(
      applyTransferSearch(rows, query, { now: new Date(NaN) }).totalMatched,
    ).toBe(0);
  });
});
