# Date-filter clock allocation

The `All time` filter previously constructed a default `Date` for each transfer before returning `true`. Production commit `9f1debe8fb5ba5f79fc6fe83349d4264faa7b13b` defers that clock until a nonzero date range needs it. Explicit caller clocks, inclusive cutoffs, invalid-date handling, and active-range behavior are preserved. The selection repair and peer pagination optimization remain intact.

## Native measurement — 4 October 2026

Node **22.16.0**, Linux x64, 100,000 records. Three warmups per implementation, then nine alternating paired samples. Times measure `Array.filter` calling the complete production helper, not rendering, API calls, storage, or full-page latency. Native clocks are used during timing; fixed-clock compatibility checks and allocation instrumentation are separate and untimed. Output membership, order and object references matched.

All time median: **12.115259 → 4.508355 ms**, **62.79% less time**. Untimed default-clock allocations fall **100,000 → 0**.

The active 30-day control measured **62.660949 → 60.724011 ms** with **100,000 default-clock allocations in both versions**. That small difference is not treated as a material active-filter improvement; raw samples vary.

Raw paired milliseconds (baseline, candidate), in execution order:

```text
All time:
11.827676  4.604149
12.521932  4.508355
12.354159  4.730149
12.115259  4.209475
11.933276  4.286680
12.185305  4.649849
12.091634  4.467593
12.650215  4.578040
12.020006  4.353351

30d:
57.947415  61.450144
67.611370  59.298888
62.732698  61.345878
59.746007  60.724011
62.942054  58.739440
62.660949  61.517115
57.514723  58.042810
63.476268  61.369984
59.706392  59.051290
```

Baseline helper blob `ec341ab656c3091f5f2d37037e7e2e4c6214bf08`, SHA-256 `091b841c006388822c59e0282aa8a5be3124870a678907218581aaf1cab6b660`. Executed/published candidate blob `697f74780073bc37775051341776eb54efc99b65`, SHA-256 `289356fe227fe6dd540326ae8637d584358a17355267c4613ae84d27b2f29006`.

## Reproduce

From the repository root with Node.js installed:

```sh
tmp=$(mktemp -d)
git show 521ef150b7da2a0d93bebfd9537a5ce1c9d2897f:src/utils/dateRange.js > "$tmp/baseline.mjs"
git show 9f1debe8fb5ba5f79fc6fe83349d4264faa7b13b:src/utils/dateRange.js > "$tmp/candidate.mjs"
node docs/performance/date-range-clock.mjs "$tmp/baseline.mjs" "$tmp/candidate.mjs"
```

The driver checks omitted and supplied clocks, empty/invalid/oversized range tokens, invalid timestamps and the inclusive boundary. Its control fixture uses fixed historical timestamps; active-range result counts change with the real run date. The recorded run retained 100,000 All time records and 30,000 30-day records. Timings are environment-specific observations, not a universal multiplier.

## Existing application checks

[Native run 37206173166](https://github.com/woahwhattheheck/RemitFlow-Frontend/actions/runs/37206173166) is successful on pinned source `9f1debe8fb5ba5f79fc6fe83349d4264faa7b13b`. All **eight unchanged** `test/integration/transfers-filter.test.jsx` cases pass, including no-filter display, date preset selection and URL restoration. The original package lock is installed with `npm ci --no-audit --no-fund`; scoped source formatting and the clean-worktree check pass. No new test file or dependency was added for this continuation.

The separate five-case selection result remains bound to production commit `6ed4086fa9520c36639b5419a42145951a16cd9a` in `docs/validation/across-page-deselection.md`; it is not added to a current-head suite total. No full build, complete suite, deployed throughput, acceptance or payout is asserted here.
