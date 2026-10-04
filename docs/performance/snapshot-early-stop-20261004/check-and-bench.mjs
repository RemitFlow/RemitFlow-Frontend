// Usage: node check-and-bench.mjs <baseline-module> <candidate-module>
// Complete source modules are imported, not extracted or rewritten functions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import os from 'node:os';

const [basePath, nextPath] = process.argv.slice(2).map((path) => resolve(path));
if (!basePath || !nextPath) throw new Error('Provide baseline and candidate module paths');
const base = await import(pathToFileURL(basePath).href);
const next = await import(pathToFileURL(nextPath).href);
const now = Date.parse('2026-10-04T12:00:00Z');
const options = { now };
const row = (id, i, extra = {}) => ({
  id,
  createdAt: new Date(now - 1_000_000 + i).toISOString(),
  recipient: `recipient-${id}`,
  status: 'pending',
  ...extra,
});
const snapshotOf = (rows, name, pageSize = 5) =>
  base.createTransferSnapshot(rows, { now, pageSize, snapshotId: name });
const equivalent = (snapshot, live, opts = options) => {
  const before = base.pageFromSnapshot(snapshot, live, opts);
  const after = next.pageFromSnapshot(snapshot, live, opts);
  assert.deepEqual(after, before);
  after.items.forEach((item, i) => assert.equal(item, before.items[i]));
  return after;
};
const regressions = [];

// 1. Last duplicate wins, missing rows fall back, pagination and stale scopes
// stay identical. Forward-only and custom array iterators keep their ordering.
{
  const original = Array.from({ length: 7 }, (_, i) => row(`r${i}`, i));
  const snapshot = snapshotOf(original, 'compat');
  const duplicate = { ...original[6], status: 'completed' };
  const live = Object.freeze([...original.filter((r) => r.id !== 'r5'), duplicate]);
  const captured = JSON.stringify(snapshot);
  const first = equivalent(snapshot, live);
  assert.equal(first.items[0], duplicate);
  assert.equal(first.items[1], snapshot.items[1].record);
  equivalent(snapshot, live, { now, cursor: first.nextCursor });
  equivalent(snapshot, live, { now, cursor: 'bad' });
  equivalent(snapshot, live, { now, filters: { status: 'failed' }, cursor: first.cursor });
  equivalent(snapshot, live, { now: now + base.SNAPSHOT_TTL_MS });
  equivalent(snapshot, new Set(live));
  const custom = [...live];
  custom[Symbol.iterator] = function* () { yield* live.slice().reverse(); };
  equivalent(snapshot, custom);
  const generator = () => (function* () { yield* live; })();
  const expected = base.pageFromSnapshot(snapshot, generator(), options);
  const actual = next.pageFromSnapshot(snapshot, generator(), options);
  assert.deepEqual(actual, expected);
  actual.items.forEach((value, i) => assert.equal(value, expected.items[i]));
  equivalent(snapshot, null);
  assert.equal(JSON.stringify(snapshot), captured);
  regressions.push('duplicate/fallback/cursor/iterable compatibility');
}

// 2. Empty snapshot skips all live rows; count accesses outside timed work.
{
  const snapshot = snapshotOf([], 'empty');
  let reads = 0;
  const live = Array.from({ length: 25 }, (_, i) => ({ get id() { reads++; return `r${i}`; } }));
  const expected = base.pageFromSnapshot(snapshot, live, options);
  assert.equal(reads, 25);
  reads = 0;
  assert.deepEqual(next.pageFromSnapshot(snapshot, live, options), expected);
  assert.equal(reads, 0);
  regressions.push('empty snapshot: 25 to 0 live-ID reads');
}

// 3. Complete tail match stops after its five records, even with older
// duplicates earlier in the array. A missing ID still inspects all rows.
{
  const original = Array.from({ length: 30 }, (_, i) => row(`r${i}`, i));
  const snapshot = snapshotOf(original, 'tail');
  let reads = 0;
  const observe = (records) => records.map((r) => ({
    ...r, get id() { reads++; return r.id; },
  }));
  const live = observe(original);
  equivalent(snapshot, live);
  reads = 0;
  next.pageFromSnapshot(snapshot, live, options);
  // The matched id is read for delete and Map insertion, as in the baseline.
  assert.equal(reads, 10);
  reads = 0;
  base.pageFromSnapshot(snapshot, live, options);
  assert.equal(reads, 35);
  const missing = observe(original.filter((r) => r.id !== 'r29'));
  reads = 0;
  next.pageFromSnapshot(snapshot, missing, options);
  assert.equal(reads, 29 + 4);
  regressions.push('tail early-stop and missing-ID full-scan');
}

const rows = Object.freeze(Array.from({ length: 100_000 }, (_, i) => Object.freeze(row(`t${i}`, i))));
const full = snapshotOf(rows, 'large');
const empty = snapshotOf([], 'empty-large');
const reversed = Object.freeze(rows.slice().reverse());
const missing = Object.freeze(rows.slice(0, -1));
const duplicateTail = Object.freeze([...rows, { ...rows.at(-1), status: 'completed' }]);
const workloads = [
  ['ascending-first-page', full, rows, options],
  ['descending-first-page', full, reversed, options],
  ['missing-one-visible-id', full, missing, options],
  ['empty-filtered-snapshot', empty, rows, options],
  ['duplicate-tail', full, duplicateTail, options],
  ['ascending-last-page', full, rows, { now, cursor: base.encodeCursor({
    snapshotId: full.id, scope: full.scope, page: 20_000, after: full.items[99_994],
  }) }],
];
let sink = 0;
const measure = (mod, snapshot, live, opts) => {
  const start = performance.now();
  for (let i = 0; i < 20; i++) sink += mod.pageFromSnapshot(snapshot, live, opts).items.length;
  return (performance.now() - start) / 20;
};
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const measurements = [];
for (const [name, snapshot, live, opts] of workloads) {
  equivalent(snapshot, live, opts);
  for (let warm = 0; warm < 3; warm++) {
    measure(base, snapshot, live, opts);
    measure(next, snapshot, live, opts);
  }
  const before = [], after = [];
  for (let i = 0; i < 9; i++) {
    if (i % 2) {
      after.push(measure(next, snapshot, live, opts));
      before.push(measure(base, snapshot, live, opts));
    } else {
      before.push(measure(base, snapshot, live, opts));
      after.push(measure(next, snapshot, live, opts));
    }
  }
  measurements.push({ name, rows: live.length, page_size: snapshot.pageSize,
    baseline_ms: median(before), candidate_ms: median(after),
    baseline_samples_ms: before, candidate_samples_ms: after,
  });
}
const blob = (path) => {
  const bytes = readFileSync(path);
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
};
console.log(JSON.stringify({
  recorded_at: new Date().toISOString(), node: process.version,
  platform: `${process.platform}/${process.arch}`, cpu: os.cpus()[0]?.model,
  baseline_blob: blob(basePath), candidate_blob: blob(nextPath),
  regression_groups_passed: regressions, workload_outputs_and_references_equal: true,
  pairs: 9, calls_per_sample: 20, warmup_samples: 3,
  scope: 'complete pure-module paging; excludes snapshot construction, filtering, UI, storage and network',
  measurements, sink,
}, null, 2));
