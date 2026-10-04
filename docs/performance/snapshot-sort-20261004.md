# Snapshot construction: prepare sort keys once

Continuation of [issue 278](https://github.com/RemitFlow/RemitFlow-Frontend/issues/278) on the original [PR297](https://github.com/RemitFlow/RemitFlow-Frontend/pull/297).

The comparator previously parsed two timestamps on every comparison. The sorter now prepares each populated row's timestamp and string ID once, sorts those keys and returns the original row references. It retains the existing descending time order, locale-aware ID comparison, stable equal-key order, invalid-date fallback, and placement of undefined entries and sparse slots. The snapshot still contains every row; no result cap or cache is introduced. Cursor generation, expiry, recovery, live-field refresh and selection behavior are unchanged.

## Measured constructor performance

Node 22.16.0, Linux x64, AMD EPYC 9V74. These are calls to the actual `createTransferSnapshot` module, including record copying, with the same fixed time and caller-supplied snapshot ID in both versions. Each workload uses two warmups followed by five paired measurements with alternating execution order. Fixture generation, garbage collection, complete-output comparison and operation counting are outside the timer.

| History              | Before ms | After ms | Speedup |
| -------------------- | --------: | -------: | ------: |
| 5,000 shuffled       |    20.349 |    3.071 |   6.63x |
| 100,000 shuffled     |   620.098 |   80.338 |   7.72x |
| 100,000 oldest-first |    37.541 |   28.876 |   1.30x |

Every paired snapshot output matched completely. The 100,000-row shuffled workload makes 100,000 timestamp parses instead of 3,058,470. A separate ordering comparison preserves row identity, Unicode locale ties, duplicate keys, invalid/epoch/pre-epoch timestamps, null, undefined and sparse slots.

The tradeoff is one temporary prepared-key record per populated row. This is not a peak-memory measurement. Results exclude storage parsing, network/provider work and React rendering; no end-to-end page or fleet-throughput speedup is claimed.

[Exact benchmark program](https://github.com/woahwhattheheck/RemitFlow-Frontend/blob/1329f02f4fc35716243cae0341cf3834d20f0109/work/snapshot-sort-20261004/benchmark.mjs) and [all paired samples](https://github.com/woahwhattheheck/RemitFlow-Frontend/blob/1329f02f4fc35716243cae0341cf3834d20f0109/work/snapshot-sort-20261004/results.json) are retained separately from the product branch. Baseline source blob: `9bc1fc12653b8e05eca72094ec6a737d9164ef72`; measured candidate blob: `f2269a1e6fea33e1ae01fa63614067ed3505627a`.

## Executed focused checks

[GitHub Actions run 37201593676](https://github.com/woahwhattheheck/RemitFlow-Frontend/actions/runs/37201593676) checked out exact source `2ae93359afb19092961f328377955106259251d4` and succeeded on October 4, 2026. Node 22.23.3 and the unchanged lockfile supplied Vitest 4.1.10 and Vite 5.4.21.

The eleven existing snapshot utility cases and two added sort regressions passed together: **13 passed, zero failed or skipped**, in 1.53 seconds. Existing cases cover concurrent inserts, expiry, filter reset, complete large-fixture paging, live-field refresh and distinct snapshot generations. The added cases check ordering compatibility and one timestamp parse per row. No existing test was removed, skipped or weakened.

The two changed JavaScript files passed the existing Prettier check. The production application built successfully: 119 modules, Vite-reported 917 ms. The job confirmed unchanged tracked contents after execution and printed the exact product and test blobs:

```text
src/utils/transferSnapshot.js             f2269a1e6fea33e1ae01fa63614067ed3505627a
test/unit/transfer-snapshot-sort.test.js   0d8d2a8ade90e9e567ac5d9d7274b814f59bec7d
```

The final integration retains those tested bytes and the concurrent report-receipt cleanup from `db690af3e2eded4f66fd99b68e654ca0ff6909b3`. The isolated execution workflow is not part of the product contribution. The earlier 477-case aggregate result remains bound to its own source; it was not rerun or relabeled as a current whole-suite result. Upstream CI approval, maintainer acceptance and any reward remain separate.

## Reproduce

From an installed checkout of the contribution:

```bash
npx --no-install vitest run test/unit/transfer-snapshot.test.js test/unit/transfer-snapshot-sort.test.js --maxWorkers=1 --fileParallelism=false
npm run build

git fetch https://github.com/woahwhattheheck/RemitFlow-Frontend.git 1329f02f4fc35716243cae0341cf3834d20f0109
git show 1329f02f4fc35716243cae0341cf3834d20f0109:work/snapshot-sort-20261004/benchmark.mjs > /tmp/rf297-benchmark.mjs
git show d86d94b516e2a496bb94ae7e627b1451ce83f2d0:src/utils/transferSnapshot.js > /tmp/rf297-baseline.mjs
node --expose-gc /tmp/rf297-benchmark.mjs /tmp/rf297-baseline.mjs src/utils/transferSnapshot.js
```
