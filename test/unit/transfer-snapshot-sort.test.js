import { describe, expect, it, vi } from 'vitest';
import { stableSortTransfers } from '../../src/utils/transferSnapshot.js';

describe('snapshot sort key preparation', () => {
  it('preserves locale ordering, stable ties, sparse slots and row references', () => {
    const rows = [
      undefined,
      null,
      { id: 'old', createdAt: '1960-01-01T00:00:00Z' },
      { id: 'invalid', createdAt: 'not-a-date' },
      ...['é', 'e\u0301', 'a', 'A', '😀', 'same', 'same'].map((id) =>
        Object.freeze({ id, createdAt: '1970-01-01T00:00:00Z' }),
      ),
    ];
    rows.length += 1;
    Object.freeze(rows);
    const expected = rows.slice().sort((a, b) => {
      const aTime = Date.parse(a?.createdAt ?? '') || 0;
      const bTime = Date.parse(b?.createdAt ?? '') || 0;
      if (bTime !== aTime) return bTime - aTime;
      return String(b?.id ?? '').localeCompare(String(a?.id ?? ''));
    });

    const sorted = stableSortTransfers(rows);
    expect(sorted).toStrictEqual(expected);
    expect(Object.keys(sorted)).toEqual(Object.keys(expected));
    sorted.forEach((record, i) => expect(record).toBe(expected[i]));
    expect(stableSortTransfers(null)).toEqual([]);
    expect(stableSortTransfers([])).toEqual([]);
  });

  it('parses each timestamp once rather than on every comparison', () => {
    const rows = Array.from({ length: 128 }, (_, i) => ({
      id: `tx_${i}`,
      createdAt: new Date(((i * 37) % 128) * 1000).toISOString(),
    }));
    const parse = vi.spyOn(Date, 'parse');
    try {
      const sorted = stableSortTransfers(rows);
      expect(parse).toHaveBeenCalledTimes(rows.length);
      expect(sorted).toHaveLength(rows.length);
      expect(sorted[0].createdAt).toBe(new Date(127000).toISOString());
    } finally {
      parse.mockRestore();
    }
  });
});
