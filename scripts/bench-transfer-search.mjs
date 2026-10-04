import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const baselinePath = args[0];
const candidatePath = args[1] ?? 'src/utils/transferSearch.js';
if (!baselinePath) {
  throw new Error(
    'Usage: node --expose-gc bench-transfer-search.mjs BASELINE [CANDIDATE]',
  );
}
const before = await import(pathToFileURL(resolve(baselinePath)).href);
const after = await import(pathToFileURL(resolve(candidatePath)).href);
const now = new Date('2026-10-04T00:00:00Z');
const rounds = 5;

function blob(path) {
  const data = readFileSync(path);
  return createHash('sha1')
    .update(`blob ${data.length}\0`)
    .update(data)
    .digest('hex');
}

function fixture(count, order) {
  return Array.from({ length: count }, (_, i) => {
    const rank =
      order === 'shuffled'
        ? (i * 7919) % count
        : order === 'ascending'
          ? i
          : count - i - 1;
    return {
      id: `tx_${i}`,
      actorId: 'GACTOR_A',
      recipient: 'amina@example.com',
      status: 'completed',
      createdAt: new Date(1700000000000 + rank * 1000).toISOString(),
    };
  });
}

function measure(fn, rows, query) {
  if (global.gc) global.gc();
  const start = performance.now();
  const result = fn(rows, query, { now });
  return { ms: performance.now() - start, result };
}

function countOperations(fn, rows, query) {
  const originalParse = Date.parse;
  const originalSort = Array.prototype.sort;
  let dateParseCalls = 0;
  const sortedLengths = [];
  Date.parse = (...values) => {
    dateParseCalls += 1;
    return originalParse(...values);
  };
  Array.prototype.sort = function (...values) {
    sortedLengths.push(this.length);
    return originalSort.apply(this, values);
  };
  try {
    fn(rows, query, { now });
    return { dateParseCalls, sortedLengths };
  } finally {
    Date.parse = originalParse;
    Array.prototype.sort = originalSort;
  }
}

function median(values) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

const report = {
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  sources: {
    baselineBlob: blob(baselinePath),
    candidateBlob: blob(candidatePath),
  },
  method: {
    rounds,
    warmupsPerVersion: 1,
    order: 'alternating before/after',
    gcBeforeEachSample: Boolean(global.gc),
    timingIncludes:
      'actual applyTransferSearch only; fixtures/assertions outside timing',
    operationCounts: 'separate untimed production calls',
    providerRequests: 0,
  },
  scenarios: [],
};
for (const [count, order, limit] of [
  [5000, 'shuffled', 100],
  [100000, 'shuffled', 100],
  [100000, 'ascending', 500],
  [100000, 'descending', 500],
]) {
  const rows = fixture(count, order);
  const query = { actorId: 'GACTOR_A', limit };
  const expected = before.applyTransferSearch(rows, query, { now });
  assert.deepEqual(after.applyTransferSearch(rows, query, { now }), expected);
  const samples = [];
  for (let round = 0; round < rounds; round += 1) {
    const calls = round % 2 === 0 ? ['before', 'after'] : ['after', 'before'];
    const pair = {};
    for (const name of calls) {
      const fn =
        name === 'before'
          ? before.applyTransferSearch
          : after.applyTransferSearch;
      const sample = measure(fn, rows, query);
      assert.deepEqual(sample.result, expected);
      assert.equal(sample.result.totalMatched, count);
      sample.result.items.forEach((row, i) =>
        assert.equal(row, expected.items[i]),
      );
      pair[name] = sample.ms;
    }
    samples.push(pair);
  }
  const baselineMedianMs = median(samples.map((pair) => pair.before));
  const candidateMedianMs = median(samples.map((pair) => pair.after));
  report.scenarios.push({
    count,
    order,
    limit,
    samples,
    baselineMedianMs,
    candidateMedianMs,
    speedup: baselineMedianMs / candidateMedianMs,
    baselineOperations: countOperations(
      before.applyTransferSearch,
      rows,
      query,
    ),
    candidateOperations: countOperations(
      after.applyTransferSearch,
      rows,
      query,
    ),
    identicalResults: true,
  });
}
console.log(JSON.stringify(report, null, 2));
