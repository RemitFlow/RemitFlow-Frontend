import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as before from './before.mjs';
import * as after from './after.mjs';

const now = Date.parse('2026-10-04T12:00:00Z');
const makeRows = (count) => Array.from({ length: count }, (_, i) => ({
  id: `tx-${i}`, createdAt: new Date(now - i * 1000).toISOString(), status: 'pending',
}));
const rows = makeRows(14);
const snapshot = before.createTransferSnapshot(rows, { now, snapshotId: 'fixed' });
const first = before.pageFromSnapshot(snapshot, rows, { now });
const second = before.pageFromSnapshot(snapshot, rows, { now, cursor: first.nextCursor });
const same = (snap, live, options) => {
  const left = before.pageFromSnapshot(snap, live, options);
  const right = after.pageFromSnapshot(snap, live, options);
  assert.deepEqual(right, left);
  right.items.forEach((row, index) => assert.equal(row, left.items[index]));
  return right;
};
const checks = [];
for (const cursor of [null, first.nextCursor, second.nextCursor]) {
  same(snapshot, rows, { now, cursor });
}
checks.push('First, middle and final pages preserve complete results, cursors and live references.');
const updated = { ...rows[5], status: 'claimed' };
const duplicate = { ...updated, status: 'cancelled' };
const changedRows = [...rows.filter(row => row.id !== rows[6].id), updated,
  { id: 'new', createdAt: new Date(now + 1000).toISOString() }, duplicate];
const changed = same(snapshot, changedRows, { now, cursor: first.nextCursor });
assert.equal(changed.items[0], duplicate);
assert.equal(changed.items[1], snapshot.items[6].record);
assert.equal(changed.totalCount, 14);
assert.equal(changed.items.some(row => row.id === 'new'), false);
checks.push('New inserts stay excluded; removed rows use snapshot fallback; last duplicate wins with its exact reference.');
for (const options of [{ now, cursor: 'malformed' },
  { now, filters: { search: 'other' }, cursor: first.nextCursor },
  { now: now + before.SNAPSHOT_TTL_MS, cursor: first.nextCursor }]) {
  assert.equal(same(snapshot, rows, options).ok, false);
}
const empty = before.createTransferSnapshot([], { now, snapshotId: 'empty' });
same(empty, [], { now });
same(snapshot, undefined, { now });
same(null, rows, { now });
checks.push('Invalid and cross-filter cursors, expired/missing snapshots, empty history and absent live rows preserve returned envelopes.');
const historical = rows.map(row => ({ ...row }));
const state = { now, snapshot, cursor: first.nextCursor, liveTransfers: changedRows };
const resolvedBefore = before.resolveTransferPage(rows, state);
const resolvedAfter = after.resolveTransferPage(rows, state);
assert.deepEqual(resolvedAfter, resolvedBefore);
resolvedAfter.page.items.forEach((row, index) => assert.equal(row, resolvedBefore.page.items[index]));
assert.deepEqual(rows, historical);
checks.push('Public resolveTransferPage composition preserves the supplied snapshot, output references and input contents.');

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const workloads = [];
for (const [count, pageSize, repeats] of [[100, 5, 100], [5000, 5, 20], [100000, 5, 3], [100000, 100, 3]]) {
  const live = makeRows(count);
  const snap = before.createTransferSnapshot(live, { now, pageSize, snapshotId: `bench-${count}-${pageSize}` });
  const page = Math.max(1, Math.floor(Math.ceil(count / pageSize) / 2));
  const cursor = before.encodeCursor({ snapshotId: snap.id, scope: snap.scope, page,
    after: snap.items[(page - 1) * pageSize - 1] ?? null });
  const options = { now, cursor };
  same(snap, live, options);
  const run = (mod) => {
    const begin = performance.now();
    let result;
    for (let i = 0; i < repeats; i++) result = mod.pageFromSnapshot(snap, live, options);
    const elapsed = (performance.now() - begin) / repeats;
    assert.equal(result.items.length, pageSize);
    return elapsed;
  };
  for (let i = 0; i < 3; i++) { run(before); run(after); }
  const left = [], right = [];
  for (let i = 0; i < 7; i++) {
    for (const [module, samples] of (i % 2 ? [[after, right], [before, left]] : [[before, left], [after, right]])) {
      global.gc?.();
      samples.push(run(module));
    }
  }
  const mapSizes = (module) => {
    const OriginalMap = global.Map;
    const maps = [];
    global.Map = class extends OriginalMap { constructor(values) { super(values); maps.push(this); } };
    try { module.pageFromSnapshot(snap, live, options); } finally { global.Map = OriginalMap; }
    return maps.map(map => map.size);
  };
  const oldMaps = mapSizes(before), newMaps = mapSizes(after);
  assert.deepEqual(oldMaps, [count]);
  assert.deepEqual(newMaps, [pageSize]);
  workloads.push({ count, pageSize, repeats, before_ms: left, after_ms: right,
    before_median_ms: median(left), after_median_ms: median(right),
    ratio: median(left) / median(right), map_entries_before: oldMaps, map_entries_after: newMaps });
}
const blob = (path) => {
  const bytes = readFileSync(new URL(path, import.meta.url));
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
};
assert.equal(blob('./before.mjs'), 'f2269a1e6fea33e1ae01fa63614067ed3505627a');
assert.equal(blob('./after.mjs'), '74893db1e8b99de594c40305b1428f83ae3c7926');
const result = { node: process.version, platform: process.platform, arch: process.arch,
  source_parent: '5ef95f76c2b77abd8458cbdbc3ca4582e4fad19c',
  before_blob: blob('./before.mjs'), after_blob: blob('./after.mjs'),
  checks, warmup_batches: 3, alternating_pairs: 7, workloads,
  limits: 'Pure production-module execution only; snapshot creation and fixture setup excluded from timed work. Map sizes observed separately, not heap memory measurements. No React, HTTP, dependency install, Vitest, build or hosted CI execution.' };
writeFileSync(new URL('./result.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
