import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) throw new Error('Usage: node date-range-bench.mjs BASELINE CANDIDATE');
const baseline = (await import(pathToFileURL(baselinePath))).isWithinDateRange;
const candidate = (await import(pathToFileURL(candidatePath))).isWithinDateRange;
const realDate = Date;
const fixedNow = '2026-10-04T12:00:00.000Z';
let clockAllocations = 0;
class FixedDate extends realDate {
  constructor(...args) {
    if (!args.length) { clockAllocations++; super(fixedNow); }
    else super(...args);
  }
}
const timestamps = ['2026-09-27T11:59:59.999Z', '2026-09-27T12:00:00.000Z', '2026-10-04T12:00:00.000Z', '2026-10-05T12:00:00.000Z', 'invalid', null, 0];
const ranges = ['', undefined, null, '0d', 'bad', '7d', '30d', '90d', '9'.repeat(320) + 'd'];
const clocks = [undefined, new Date(fixedNow), new Date('invalid')];
globalThis.Date = FixedDate;
let comparisons = 0;
try {
  for (const created of timestamps) for (const range of ranges) for (const now of clocks) {
    assert.equal(candidate(created, range, now), baseline(created, range, now));
    comparisons++;
  }
  for (const fn of [baseline, candidate]) {
    assert.equal(fn('2026-09-27T11:59:59.999Z', '7d'), false);
    assert.equal(fn('2026-09-27T12:00:00.000Z', '7d'), true);
    assert.throws(() => fn(fixedNow, '7d', null), TypeError);
  }
} finally { globalThis.Date = realDate; }

const rows = Array.from({ length: 100_000 }, (_, i) => ({ id: i, createdAt: new Date(Date.parse(fixedNow) - (i % 100) * 86400000).toISOString() }));
const allocationCounts = [];
for (const range of ['', '30d']) {
  const counts = [];
  globalThis.Date = FixedDate;
  try {
    for (const fn of [baseline, candidate]) {
      clockAllocations = 0;
      rows.filter(row => fn(row.createdAt, range));
      counts.push(clockAllocations);
    }
  } finally { globalThis.Date = realDate; }
  allocationCounts.push({ range, baseline: counts[0], candidate: counts[1] });
}
const workloads = [];
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const range of ['', '30d']) {
  // Native clock is used during measurement. Fixtures are hours from any edge.
  const before = rows.filter(row => baseline(row.createdAt, range));
  const after = rows.filter(row => candidate(row.createdAt, range));
  assert.equal(before.length, after.length);
  before.forEach((row, i) => assert.equal(row, after[i]));
  const run = fn => { const start = performance.now(); const result = rows.filter(row => fn(row.createdAt, range)); return { ms: performance.now() - start, count: result.length }; };
  for (let i = 0; i < 3; i++) { run(baseline); run(candidate); }
  const samples = [];
  for (let i = 0; i < 9; i++) {
    let a, b;
    if (i % 2) { b = run(candidate); a = run(baseline); }
    else { a = run(baseline); b = run(candidate); }
    assert.equal(a.count, b.count);
    samples.push({ baseline_ms: a.ms, candidate_ms: b.ms });
  }
  workloads.push({ range, count: before.length, baseline_median_ms: median(samples.map(s => s.baseline_ms)), candidate_median_ms: median(samples.map(s => s.candidate_ms)), samples });
}
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
console.log(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, baseline_sha256: hash(baselinePath), candidate_sha256: hash(candidatePath), comparisons, allocationCounts, workloads }, null, 2));
