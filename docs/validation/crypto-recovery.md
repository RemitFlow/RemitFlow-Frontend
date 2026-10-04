# Transfer fingerprint fallback and legacy recovery

## Failure and reproduction

The Send Money page already hashes the canonical transfer payload before saving
its recovery reference. The correction here is not a raw-recipient storage fix.
When `crypto.subtle` was absent, `idempotencyKeyFor` instead used 32-bit FNV-1a.
These two different valid recipient addresses produced the same recovery
fingerprint, `idem_489b5d95`:

- `recipient-103w456@example.com`
- `recipient-1p5osr6@example.com`

For both, the other canonical fields are `USD`, `NGN`, `25`, `36642.38`, `0.25`,
and `1480.5` (source, destination, sent, received, fee, rate). The canonical
input is the JSON array of the recipient followed by those six strings.
The pair was found in a bounded local search and is fixed in the regression;
the regression does not run a brute-force search.

Saving an unknown operation for one old fingerprint lets a lookup for the
other recipient select that same operation. The mock API's existing independent
full-payload comparison still rejects a conflicting replay. This demonstrates
incorrect recovery binding and a false conflict, not a wrong payment, live
provider exploit, or actual money movement. Changing SubtleCrypto availability
also formerly changed the fingerprint of identical details.

## Repair

The existing SubtleCrypto SHA-256 path is unchanged. Without SubtleCrypto, the
utility lazily loads `hash` from the existing `@stellar/stellar-sdk` dependency.
Both paths hash UTF-8 and retain the first 32 hexadecimal characters, preserving
the existing 128-bit SHA-256-derived `idem_` representation. No new dependency,
canonical-payload format, nonce behavior, or API comparison is introduced.

The two corrected fingerprints are:

```text
idem_c1c4fbc87f8298fbaaa08f2abf483014
idem_292b27e8347f595af102c42d966ae47c
```

## Existing browser sessions

An old `idem_` fingerprint followed by eight lowercase hexadecimal characters
cannot be safely rebound to an entered payload: the old fingerprint may collide.
A strict pre-submit lookup therefore refuses choosing that weak record or
minting a new intent while an unresolved weak record remains. It leaves the
stored bytes, original idempotency key, and operation status unchanged and shows
a specific reconciliation message before calling `addTransfer`.

Normal recovery reads still expose the original key. An accepted transfer can
be found by that key or its saved transfer ID and acknowledged through the
existing success dialog. A separately saved exact strong match may still be
retried. Failed or explicitly dismissed legacy records do not block a new
intent. No record is automatically deleted, rehashed, marked failed, or assumed
unsubmitted. Do not clear an unknown operation merely to bypass the message;
resolve its outcome through the existing transfer history/provider first.

## Focused check

From the repository root, using the existing locked dependencies:

```sh
npx vitest run test/integration/send-money-crypto-recovery.test.jsx
```

The file checks native/fallback UTF-8 key equivalence, the real collision pair,
legacy states and unchanged journal bytes, independent strong retry, and the
actual Send Money block/reconciliation UI using the maintained mock API.
It does not establish live backend idempotency or cross-tab persistence.

## Executed results — October 4, 2026

The isolated [hosted run 37193994776](https://github.com/woahwhattheheck/RemitFlow-Frontend/actions/runs/37193994776)
checked out exact product `fe08b70814f2a3e9994d457e60f487832680d389`, installed
the unchanged lockfile, and used Node 24.21.0, Vitest 4.1.10, and Stellar SDK
12.3.0. It executed only this ten-case file: nine passed, one failed. The failure
was the exact-text selector omitting the warning-icon prefix from the existing
`ErrorMessage` component. All crypto, collision, legacy state, strong retry, and
accepted-legacy reconciliation cases passed. This run is not reported as green.
Its original log is retained in [artifact 11299594080](https://github.com/woahwhattheheck/RemitFlow-Frontend/actions/runs/37193994776/artifacts/11299594080).

The subsequent [composed source e6405a32](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/e6405a32e9c68df8281dcf17dbd5bcde068412d2)
preserves the crypto repair and adds the separate wallet-admission contribution.
It corrects only that assertion's displayed-text selector, retaining the
no-transfer and unchanged-journal assertions. Its recorded focused rerun passes
all ten cases in 4.13 seconds on Node 24.19.0 and Vitest 4.1.10. The same commit
records a successful composed Vite production build, including the deferred SDK
fallback chunk. These are separate local composition results, not a relabeling
of the failed hosted run or an additional run in that workflow.

No second hosted run was launched after the completed composition evidence
became available. The previously recorded full-suite failures were still
outstanding at that stage. The subsequent combined package check below resolves
those local failures without relabeling the earlier hosted run. No live wallet,
provider, settlement, or payment outcome was exercised.

## Combined package acceptance — October 4, 2026

The combined acceptance pass composed
the wallet-admission and crypto-recovery repairs with the existing
offline, form, precision, and quote fixture corrections. The tests follow the
actual Review, Confirm, and View Transfers flow and assert canonical decimal
strings and minimum-fee arithmetic. PR295 retains its session-storage resets;
the two other precision setups now also start with independent recovery state.
No test cases were removed, skipped, or added by this acceptance pass.

One existing product mismatch also required correction: when quote construction
returns null after input validation, the review handler now displays the same
pricing error as confirmation instead of misreporting a nonpositive amount.
The existing no-submission regression assertion is preserved.

The exact 352-file tracked source snapshot used the unchanged package manifest,
lockfile, test configuration, formatter configuration, and ignore rules. Logs
and the dependency cache were outside that source snapshot. The existing
Prettier 3.9.6 formatter corrected only its 13 flagged files.

| Required local gate                | Result                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `prettier --check .`               | Passed after formatting; unchanged formatter rules.                                                 |
| `npm audit --audit-level=critical` | Exit 0; zero critical findings. The report still contains 20 high, 12 moderate, and 2 low findings. |
| Full package test selection        | **522 passed across 51 files**, 65.64 seconds, Vitest 4.1.10, two workers.                          |
| `vite build`                       | Passed in 4.79 seconds, Vite 5.4.21, 122 modules transformed.                                       |

The full suite used the package's maintained selection:

```sh
node node_modules/vitest/vitest.mjs run \
  test/integration test/unit test/components test/services \
  test/lighthouse-config.test.js test/security --maxWorkers=2
```

This execution used Node 24.19.0 and a writable temporary directory. The
repository's Node 22 hosted CI remains a separate result. These local checks
do not establish merge, sponsor acceptance, or payment.

The build's main JavaScript chunk is 229.36 kB minified (74.37 kB gzip). The
deferred Stellar SDK fallback is 903.71 kB minified (234.96 kB gzip), which
continues to produce the existing large-chunk warning. This is a build-size
measurement, not a browser-load or live-provider performance benchmark.
