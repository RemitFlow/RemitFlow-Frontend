# Snapshot page lookup: early termination

This continuation of PR297 changes only live-record lookup in
`src/utils/transferSnapshot.js`. The preceding bounded lookup remains; no
full-history map or persistent cache is introduced.

For ordinary arrays, scanning backward makes the first match the last duplicate
in input order. Removing resolved IDs from the page-sized set permits an early
stop once every visible ID is found. Empty pages read no records. Missing IDs
still require a full scan and retain their snapshot fallback. Sets, generators,
and arrays with custom iterators keep the forward-only duplicate policy.

## Executed source and results

Baseline commit: `3bb8747d62c1e9690f9a1559c7f6d73f792bd9d1`.
Baseline source blob: `74893db1e8b99de594c40305b1428f83ae3c7926`.
Candidate source blob: `f12b9a0163b8d47b8d0e903764245ae18a1ea2a2`.

Node v22.16.0, Linux x64, AMD EPYC 9V74. Complete unmodified modules were
imported, not extracted functions. Nine alternating pairs, twenty calls per
sample, three warmup samples. Medians are milliseconds per `pageFromSnapshot`
call; source loading, fixture/snapshot creation and assertions are untimed.

| 100,000-row workload, five-row page | Before | After |
| --- | ---: | ---: |
| Ascending input, first/newest page | 2.793942 | 0.007302 |
| Descending input, first/newest page | 2.754172 | 2.726743 |
| One visible ID missing (99,999 live rows) | 2.621030 | 2.336080 |
| Empty filtered snapshot | 1.590464 | 0.002271 |
| Last duplicate appended (100,001 live rows) | 2.790019 | 0.005145 |
| Ascending input, last/oldest page | 2.798958 | 2.804947 |

All six complete output objects and returned record references agreed.
Three focused assertion groups passed: duplicate/fallback/cursor/iterable
compatibility; empty-page work elimination; early termination and missing-ID
full-scan behavior. Untimed access counts distinguished actual work: an empty
page read 25 to 0 IDs; a five-row tail page over 30 rows read 35 to 10 IDs
(including the second ID read used to insert a match). Frozen inputs and the
snapshot stayed unchanged. Scope rejection, expiry and page-two cursor behavior
were included in the compatibility group.

These are input-position-dependent improvements, not a general 100,000-row
constant-time claim. The last-page full-scan median was essentially unchanged,
slightly higher in this run. Full scans remain O(N), with O(page size) auxiliary
storage. No browser, rendering, storage, provider, quota or whole-application
speedup is asserted. Prior benchmark ratios must not be multiplied by these
results.

## Reproduce

From a checkout containing this continuation:

```sh
work=$(mktemp -d)
git show 3bb8747d62c1e9690f9a1559c7f6d73f792bd9d1:src/utils/transferSnapshot.js > "$work/base.mjs"
cp src/utils/transferSnapshot.js "$work/candidate.mjs"
node docs/performance/snapshot-early-stop-20261004/check-and-bench.mjs \
  "$work/base.mjs" "$work/candidate.mjs"
```

`results.json` retains every timed sample and source identity. The script uses
only Node built-ins and exits nonzero on an assertion failure. The first local
invocation stopped before imports because its argument mapper passed unwanted
Array.map parameters to path.resolve; that script-only error was corrected before
the retained execution. No product change was made in response to that error.

No dependency installation, Vitest suite, production build, new workflow or
external provider call was performed for this continuation. Existing maintained
tests were not changed or weakened; their historical results are not represented
as a new run at this source. Sponsor review and acceptance remain separate.
