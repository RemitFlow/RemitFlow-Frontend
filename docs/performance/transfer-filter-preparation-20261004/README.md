# Query-invariant transfer filter preparation

Continuation of RemitFlow Frontend #281 on the existing PR #298. The earlier bounded-heap selector is retained; this comparison starts from that already-optimized implementation, not the old full sort.

The status alias, folded search term and date-window cutoff are prepared once per invocation. Rows are still read and matched on every query; no result cache or stale-window reuse is introduced. Empty filters bypass the matcher. Actor visibility, returned row identity, stable top-k membership, totals and scope keys are retained.

## Focused native execution

Node v22.23.3; Vitest 4.1.10; Prettier 3.9.6; linux/x64; AMD EPYC 7763 64-Core Processor.
The existing 11 utility cases and two new maintained regressions passed together: **13 passed, zero failures or skipped tests**. The new cases cover one clock read per query, inclusive date boundaries, fresh time on subsequent calls, unbounded presets and invalid/oversized windows.
The original repository Vite configuration, jsdom setup and locked dependencies were used. Only these two utility test files ran; no full application suite, build, browser or provider execution is claimed.

[Execution run](https://github.com/woahwhattheheck/RemitFlow-Frontend/actions/runs/37200367081). Candidate before formatting: b3af1368de7e2d043a79ae49fe912584375eadfa. Tests and timings below executed the formatted files committed with this report.

## Complete-selector timings

Synthetic histories; three warmups followed by nine paired samples with alternating order. Fixture creation, assertions, garbage collection and operation counting are outside the timed selector call. All paired outputs and row references matched; a further 10,368 untimed compatibility comparisons passed.

| Workload               | Baseline ms | Prepared ms | Time reduction |
| ---------------------- | ----------: | ----------: | -------------: |
| 5k all time            |       3.753 |       3.100 |         17.40% |
| 100k all time          |      38.884 |      30.025 |         22.78% |
| 100k date window       |      77.677 |      41.512 |         46.56% |
| 100k status and search |      23.599 |      20.468 |         13.27% |
| 100k combined filters  |      37.811 |      26.264 |         30.54% |

All raw paired samples, output digests, source Git blobs and separately measured operation counts are in [results.json](results.json). Negative reductions, if present, are regressions, not speedups. These measurements exclude localStorage decoding, schema validation, the simulated API delay, React rendering and network/provider work; they are not whole-page or fleet-throughput results.

An earlier local prototype without the empty-filter bypass regressed the 5,000-row all-time case by 15.93% in one paired measurement. That prototype was rejected. The revised local pass measured 1.536 versus 1.542 ms for that small workload (effectively unchanged), 69.875 versus 40.020 ms for the 100,000-row date window and 32.628 versus 22.354 ms for combined filters. Those exploratory Node 22.16.0 observations are separate from the source-bound execution above.

## Reproduce

```bash
git show ecefe06d68ca6838434b755525cfc3cc6c701d4f:src/utils/transferSearch.js > src/utils/transferSearch.baseline.js
node --expose-gc scripts/bench-transfer-filter-preparation.mjs src/utils/transferSearch.baseline.js
npx vitest run test/unit/transfer-search.test.js test/unit/transfer-filter-preparation.test.js
rm src/utils/transferSearch.baseline.js
```

No existing test, package manifest, lockfile, UI or API path was changed. The temporary execution workflow is not part of the product result. Original contribution and claim custody remain unchanged; this report establishes neither maintainer acceptance nor an award/payment.
