#!/usr/bin/env node
// Compare complete production selectors; no benchmark replacement of product code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import os from 'node:os';

const [baselineArg, candidateArg = 'src/utils/transferSearch.js'] =
  process.argv.slice(2);
if (!baselineArg) {
  console.error(
    'Usage: node --expose-gc scripts/bench-transfer-filter-preparation.mjs BASELINE [CANDIDATE]',
  );
  process.exit(2);
}
const baselinePath = resolve(baselineArg);
const candidatePath = resolve(candidateArg);
const baseline = await import(pathToFileURL(baselinePath));
const candidate = await import(pathToFileURL(candidatePath));
const gitBlob = (path) => {
  const bytes = readFileSync(path);
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
};
const now = new Date('2026-10-04T12:00:00.000Z');
const options = { now, legacyActorId: 'demo' };
let seed = 20261004;
const random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
function makeHistory(count) {
  const statuses = ['pending', 'submitted', 'completed', 'settled', 'failed'];
  const rows = Array.from({ length: count }, (_, index) => ({
    id: String(index).padStart(8, '0'),
    actorId: index % 7 === 0 ? 'other' : 'demo',
    recipient: index % 3 === 0 ? 'BOB' : 'Alice Smith',
    status: statuses[index % statuses.length],
    createdAt: new Date(
      now.getTime() - (index % 120) * 86400000 - (index % 1000),
    ).toISOString(),
  }));
  for (let i = rows.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return Object.freeze(rows.map(Object.freeze));
}
const large = makeHistory(100_000);
const small = large.slice(0, 5_000);
const cases = [
  ['5k all time', small, { actorId: 'demo' }],
  ['100k all time', large, { actorId: 'demo' }],
  ['100k date window', large, { actorId: 'demo', range: '30d' }],
  [
    '100k status and search',
    large,
    { actorId: 'demo', status: 'submitted', search: ' ALICE ' },
  ],
  [
    '100k combined filters',
    large,
    {
      actorId: 'demo',
      status: 'settled',
      search: ' ALICE ',
      range: '90d',
      limit: 500,
    },
  ],
];
function compareResults(expected, actual) {
  assert.deepEqual(actual, expected);
  assert.equal(actual.items.length, expected.items.length);
  actual.items.forEach((item, index) =>
    assert.strictEqual(item, expected.items[index]),
  );
}
const median = (samples) =>
  [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)];
function measure(selector, rows, query) {
  globalThis.gc?.();
  const start = performance.now();
  const result = selector.applyTransferSearch(rows, query, options);
  return { result, ms: performance.now() - start };
}
function operationCounts(selector, rows, query) {
  // Instrumentation is separate from all timing calls and restored in finally.
  const NativeDate = globalThis.Date;
  const originalLower = String.prototype.toLowerCase;
  const originalMatch = String.prototype.match;
  const counts = {
    date_constructions: 0,
    lowercase_calls: 0,
    string_match_calls: 0,
  };
  globalThis.Date = new Proxy(NativeDate, {
    construct(target, args, newTarget) {
      counts.date_constructions += 1;
      return Reflect.construct(target, args, newTarget);
    },
  });
  String.prototype.toLowerCase = function (...args) {
    counts.lowercase_calls += 1;
    return Reflect.apply(originalLower, this, args);
  };
  String.prototype.match = function (...args) {
    counts.string_match_calls += 1;
    return Reflect.apply(originalMatch, this, args);
  };
  try {
    return {
      counts,
      result: selector.applyTransferSearch(rows, query, options),
    };
  } finally {
    globalThis.Date = NativeDate;
    String.prototype.toLowerCase = originalLower;
    String.prototype.match = originalMatch;
  }
}
const observations = [];
for (const [name, rows, query] of cases) {
  const expected = baseline.applyTransferSearch(rows, query, options);
  for (let warmup = 0; warmup < 3; warmup += 1) {
    compareResults(
      expected,
      baseline.applyTransferSearch(rows, query, options),
    );
    compareResults(
      expected,
      candidate.applyTransferSearch(rows, query, options),
    );
  }
  const pairs = [];
  for (let repeat = 0; repeat < 9; repeat += 1) {
    const order =
      repeat % 2 === 0 ? ['baseline', 'candidate'] : ['candidate', 'baseline'];
    const pair = { order };
    for (const key of order) {
      const measured = measure(
        key === 'baseline' ? baseline : candidate,
        rows,
        query,
      );
      compareResults(expected, measured.result);
      pair[key] = measured.ms;
    }
    pairs.push(pair);
  }
  const oldCounts = operationCounts(baseline, rows, query);
  const newCounts = operationCounts(candidate, rows, query);
  compareResults(expected, oldCounts.result);
  compareResults(expected, newCounts.result);
  const baselineMedian = median(pairs.map((pair) => pair.baseline));
  const candidateMedian = median(pairs.map((pair) => pair.candidate));
  observations.push({
    name,
    rows: rows.length,
    query,
    total_matched: expected.totalMatched,
    returned: expected.items.length,
    baseline_median_ms: baselineMedian,
    candidate_median_ms: candidateMedian,
    reduction_percent: 100 * (1 - candidateMedian / baselineMedian),
    operation_counts: {
      baseline: oldCounts.counts,
      candidate: newCounts.counts,
    },
    result_sha256: createHash('sha256')
      .update(JSON.stringify(expected))
      .digest('hex'),
    pairs,
  });
}
// Differential compatibility checks are untimed and use unchanged row identities.
let compatibility = 0;
const dates = [
  undefined,
  null,
  '',
  'bad',
  0,
  -1,
  '0',
  '1970-01-01T00:00:00Z',
  '1969-12-31T23:59:59Z',
  '2026-10-04T12:00:00Z',
  '2026-09-27T12:00:00Z',
  '2026-09-27T11:59:59.999Z',
  new Date('2026-09-27T12:00:00Z'),
  new Date(NaN),
  '2027-01-01T00:00:00Z',
];
const ranges = [
  '',
  '0d',
  '0007d',
  '7d',
  '30d',
  '90d',
  'unknown',
  '99999999999999999d',
  '9'.repeat(400) + 'd',
];
const edgeRows = Object.freeze(
  dates
    .flatMap((createdAt, index) => [
      {
        id: `a${index}`,
        createdAt,
        recipient: 'Alice',
        status: 'settled',
        actorId: 'demo',
      },
      { id: `b${index}`, createdAt, recipient: 'BOB', status: 'submitted' },
      {
        id: `c${index}`,
        createdAt,
        recipient: 'Älice',
        status: 'failed',
        actorId: 'other',
      },
    ])
    .map(Object.freeze),
);
for (const instant of [now, new Date(NaN)]) {
  for (const range of ranges) {
    for (const status of ['', 'settled', 'submitted', 'invalid']) {
      for (const search of ['', ' ALICE ', 'nobody']) {
        const filters = { range, status, search };
        for (const row of edgeRows) {
          assert.equal(
            candidate.matchesTransferFilters(row, filters, instant),
            baseline.matchesTransferFilters(row, filters, instant),
          );
          compatibility += 1;
        }
        for (const limit of [1, 10, 500]) {
          const query = { actorId: 'demo', ...filters, limit };
          const opt = { ...options, now: instant };
          compareResults(
            baseline.applyTransferSearch(edgeRows, query, opt),
            candidate.applyTransferSearch(edgeRows, query, opt),
          );
          compatibility += 1;
        }
      }
    }
  }
}
console.log(
  JSON.stringify(
    {
      schema: 'transfer-filter-preparation-benchmark/v1',
      executed_at: new Date().toISOString(),
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      cpu: os.cpus()[0]?.model,
      source: {
        baseline_blob: gitBlob(baselinePath),
        candidate_blob: gitBlob(candidatePath),
      },
      method:
        '3 warmups; 9 paired samples, alternating order; synthetic fixed records; setup/assertions/GC/counting outside timed calls',
      scope:
        'Complete production applyTransferSearch and its actual dependency modules, not storage/API/React/browser/provider latency.',
      compatibility_checks: compatibility,
      observations,
    },
    null,
    2,
  ),
);
