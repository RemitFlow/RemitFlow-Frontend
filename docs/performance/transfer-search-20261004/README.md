# Capped transfer search performance

Issue: [RemitFlow Frontend #281](https://github.com/RemitFlow/RemitFlow-Frontend/issues/281)
Existing submission: [PR #298](https://github.com/RemitFlow/RemitFlow-Frontend/pull/298)

`applyTransferSearch` previously built two full arrays, sorted every matching
transfer and then returned at most 500 rows. Its comparator reparsed each
timestamp on every comparison. Large unsorted histories therefore spent most
of their query time sorting rows that would never be returned.

The selector now scans the history once and retains only the best requested
rows in a bounded heap. It parses each matching timestamp once, sorts the
retained rows, and still counts every match. The public `stableSortTransfers`
helper and the actor, status, search and date predicates are unchanged.

## Observed production-module timings

Node **24.19.0**, Linux x64. Each row below is the median of five paired
measurements, alternating execution order after one warmup per version.
Fixtures, garbage collection and output assertions were outside the timed
call. The timed function is the actual imported `applyTransferSearch`.

| History                        | Result cap | Before, ms | After, ms | Speedup |
| ------------------------------ | ---------: | ---------: | --------: | ------: |
| 5,000 shuffled transfers       |        100 |     22.827 |     2.484 |   9.19x |
| 100,000 shuffled transfers     |        100 |    776.075 |    26.912 |  28.84x |
| 100,000 oldest-first transfers |        500 |     44.631 |    31.982 |   1.40x |
| 100,000 newest-first transfers |        500 |     46.296 |    25.439 |   1.82x |

Every timed result matched the baseline's complete return value and original
row references. The 100,000-row shuffled case reduced `Date.parse` calls from
3,031,310 to 100,000 and sorted 100 rows instead of 100,000. Operation counts
were measured in separate, untimed calls. Full paired samples and source
hashes are retained in [results.json](results.json).

These measurements cover the repository's localStorage demo query selector.
They exclude storage parsing, transfer-schema validation, the API's simulated
400 ms delay, React rendering and external providers. They establish neither
end-to-end page latency nor live-provider throughput. Heap retention is bounded
by the normalized result limit; no measured peak-memory result is claimed.

## Compatibility and focused validation

The selector preserves descending creation time, descending exact ID-string
order and original input order for identical time/ID keys. It returns the same
`items`, `totalMatched`, `capped` and `scopeKey`, and preserves row references.
It does not mutate inputs or change actor visibility, filters, query caps,
navigation, debounce or request cancellation.

The maintained `test/unit/transfer-search.test.js` file passed **11/11** cases
under Vitest **4.1.10** and Node **24.19.0**: all nine existing cases plus two
focused regressions. New coverage compares against the unchanged public sort
across caps and filters, duplicate keys at the cap boundary, frozen inputs,
row identity, sparse legacy histories, invalid/epoch/pre-1970 timestamps and
distinct Unicode IDs. Independent source review found no blockers.

The run used the installed Vitest package and a Node-only configuration for
this pure utility file. No dependency installation or assertion substitution
was used. The repository-wide test suite, production build and hosted CI were
not rerun for this utility continuation; earlier PR evidence retains its own
source revision and limitations. No full-suite or sponsor-acceptance claim is
made here.

## Reproduce

From a checkout containing this change and the baseline commit, stage the old
selector beside the current one so both use the same unchanged dependencies:

```bash
git show 09cad8dff6d55a35b39d6836d31d045cdc1b938b:src/utils/transferSearch.js > src/utils/transferSearch.baseline.js
node --expose-gc scripts/bench-transfer-search.mjs src/utils/transferSearch.baseline.js
npx vitest run test/unit/transfer-search.test.js
```

The benchmark needs Node only and writes JSON to stdout. An optional second
path selects a different candidate module. It asserts complete baseline
equivalence for every sample and reports both input source hashes. The
baseline staging file is temporary and is not part of the contribution.

| Executed source      | Git blob                                   |
| -------------------- | ------------------------------------------ |
| Baseline selector    | `be8db651d5c2457323d6f8373a170a41d8b99b87` |
| Updated selector     | `a75e2e4fe88e16cb0b03ed97aa0a1c18dbba1274` |
| Maintained unit file | `22be7a01462fd6a612d40cdc9e34f0c9f1f443ea` |

The original contribution and claim remain unchanged. This is performance
follow-through on the existing submission; it does not establish a new award
or payment.
