# Snapshot page lookup — October 4, 2026

## Change and scope

Source commit: `45b60908dbb19e16fad573c1c7d8a0768b62071f`.
Parent: `5ef95f76c2b77abd8458cbdbc3ca4582e4fad19c`.
Production file: `src/utils/transferSnapshot.js`.
Before blob: `f2269a1e6fea33e1ae01fa63614067ed3505627a`.
After blob: `74893db1e8b99de594c40305b1428f83ae3c7926`.

`pageFromSnapshot` formerly built a complete live-history Map and an intermediate array of pairs for every page. It now selects the visible snapshot IDs first and retains live records only for those IDs. The scan still covers the full live list, so the last occurrence of a duplicate ID wins exactly as before. There is no persistent cache: each call sees current live fields, while missing rows fall back to their captured snapshot records. Invalid or expired cursors return before constructing a live lookup.

The live scan remains O(N). Its lookup and selected-ID storage are O(K), where K is the number of distinct IDs on the page, rather than O(N). This does not reduce the memory occupied by the full input or snapshot. A page as large as the history does not get the same bounded-storage advantage. Constructor sorting, generation IDs, snapshot membership, cursor encoding and expiry are unchanged.

## Executed measurement

Runtime: Node **22.16.0**, Linux x64. The complete before and after production modules were executed directly, without substitutes for their helpers. Both source blobs were checked. The [retained program](snapshot-page-lookup-20261004.mjs) completed with exit 0.

Each workload uses its middle page. Fixture and snapshot construction are outside timing. There are three warmup batches and seven alternating paired samples; each sample is a mean per call within its stated batch. Explicit GC runs outside each timed batch. The table shows medians of the seven samples, not whole-page browser latency.

| Live rows | Page size | Calls/sample | Before ms | After ms | Ratio | Observed lookup entries |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 5 | 100 | 0.020131 | 0.016869 | 1.19x | 100 → 5 |
| 5,000 | 5 | 20 | 0.493533 | 0.091068 | 5.42x | 5,000 → 5 |
| 100,000 | 5 | 3 | 14.268989 | 1.605926 | 8.89x | 100,000 → 5 |
| 100,000 | 100 | 3 | 12.362670 | 2.287825 | 5.40x | 100,000 → 100 |

Map entry counts come from a separate untimed observation of the actual lookup. They are not measured peak heap bytes. Microsecond-scale results and early warmup/JIT variation should not be overinterpreted.

### Raw per-call samples, milliseconds

```json
[
  {"rows":100,"pageSize":5,
   "before":[0.020904550000000056,0.019497279999999933,0.01819867000000002,0.019946429999999963,0.020131609999999966,0.02829431999999997,0.020130809999999996],
   "after":[0.018028210000000086,0.018327660000000065,0.01532865000000001,0.011325760000000002,0.011858349999999972,0.01686930999999987,0.018421589999999953]},
  {"rows":5000,"pageSize":5,
   "before":[0.5121488,0.4935328999999996,0.43395425000000076,0.48608490000000015,0.503021849999999,0.7880583000000001,0.48717710000000236],
   "after":[0.2903851000000003,0.2652936999999994,0.08597545000000081,0.09106749999999977,0.09093775000000051,0.07686855000000037,0.10441905000000133]},
  {"rows":100000,"pageSize":5,
   "before":[14.268988666666663,11.53207100000001,17.691984666666674,15.693690333333356,11.250089666666668,14.46507866666665,12.394973666666601],
   "after":[1.6874616666666877,1.6644346666666554,1.591400333333354,1.6059256666666595,1.5914606666666486,1.5756039999999985,1.9031326666666548]},
  {"rows":100000,"pageSize":100,
   "before":[13.55541733333333,12.140986999999996,12.891106666666625,11.468530999999984,11.978391000000025,15.603217666666675,12.362669666666685],
   "after":[4.9937950000000155,2.3221353333333354,2.2647876666666584,2.2925716666666176,2.2407690000000002,2.2878249999999603,2.2664766666666765]}
]
```

## Compatibility observed

Complete output envelopes and every returned row's object identity match the parent on the four large/small measurement workloads. The same program separately checks first/middle/final paging; insertion exclusion; current-field updates; last-duplicate selection; missing-row fallback; malformed and cross-filter cursors; expired and missing snapshots; empty and absent live lists; and `resolveTransferPage` composition with the original snapshot and unchanged input contents.

These are focused direct-module observations, not a Vitest or application-suite result. Existing tests, dependencies and workflow files were not changed. The earlier source-pinned constructor and application results remain historical; they were not rerun for this change. No React rendering, HTTP/API, browser, production build, hosted-CI, deployed-performance, sponsor-acceptance or payment result is asserted.

## Reproduce from an existing checkout

No dependency installation is required; the modules use native Node facilities. Preserve the supplied input versions rather than silently comparing later source.

```sh
work=$(mktemp -d)
git show 5ef95f76c2b77abd8458cbdbc3ca4582e4fad19c:src/utils/transferSnapshot.js > "$work/before.mjs"
git show 45b60908dbb19e16fad573c1c7d8a0768b62071f:src/utils/transferSnapshot.js > "$work/after.mjs"
git show d81632ab7aa3518e49d10d7b69c307b14cbcef0e:docs/performance/snapshot-page-lookup-20261004.mjs > "$work/measure.mjs"
node --expose-gc "$work/measure.mjs"
# The program also writes "$work/result.json".
```
