# PR297: existing CI gate execution

The complete local test selection passed **477/477 tests across 49 files**, with zero failed, pending, or todo tests. The existing formatting check and production build also passed. These results close the local acceptance work required by issue 278; hosted CI, Lighthouse, sponsor acceptance and reward payment are separate.

## Source and scope

- Original contribution: [RemitFlow Frontend PR297](https://github.com/RemitFlow/RemitFlow-Frontend/pull/297), issue 278.
- Executed source: [`157ff7bffe98c96ad48b39c844ff51a0a070679a`](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/157ff7bffe98c96ad48b39c844ff51a0a070679a).
- Exact source tree: `a4af225ae83e3f688ef7fa7c0e73d00d6c998bff`; 344 tracked blobs and modes.
- Parent: `aa146d6c8280554cf95849f9912e8a9c1d21baf2`, retaining the snapshot-selection recovery fix and all earlier pagination work.
- The documentation child adds only this report, receipt and raw archive. Its application and test source matches the executed source.

Four existing fixture files reuse the already-executed PR296 corrections from `17dd96c4593fcd599286d263ed7cb72f6a4b7c20`. Each original fixture blob matched before composition. Confirmation and result navigation now follow the existing UI; offline blocking, retry, exactly-once creation, quote precision and receipt assertions remain. Canonical decimal assertions follow existing quote behavior. No test title or case was removed or skipped.

The one production correction in `SendMoney.jsx` is derived from this branch: when a validated positive amount cannot be priced, the review step reports a pricing error. It preserves this branch's wallet, submission and page contracts. The four fixture files were copied only after their full original blob identities matched; `SendMoney.jsx` was not copied from another PR.

Prettier 3.9.6 identified nine files needing formatting. Only those flagged paths were formatted. Thirteen paths changed overall; package metadata, dependency lock, workflow/config files and the prior snapshot-selection product fix remain unchanged.

## Results

| Gate                            | Result                                                   | Observation                                                                        |
| ------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Complete package test selection | **477 passed, 0 failed, 0 pending, 0 todo; 49/49 files** | One aggregate execution ; 57.113 s process, 56.57 s Vitest                         |
| Existing Prettier check         | **Passed**                                               | Nine flagged paths corrected; final check exit 0                                   |
| Production build                | **Passed**                                               | `npm run build`, exit 0; 2.309 s command, Vite 5.4.21 reported 1.55 s; 119 modules |
| Critical audit threshold        | **Shared fresh receipt reused: 0 critical**              | Actual shared scan at 11:56:36Z for identical dependency blobs; no duplicate scan  |

Tests started 2026-10-04T11:54:56.918428Z and finished 11:55:54.031767Z. The build ran 11:56:29.250298Z–11:56:31.558839Z. Every one of the 344 tracked source files matched the manifest before and after both commands. The JSON reporter includes nested describe-suite totals; 49 is the actual test-file count from its `testResults` array.

## Reproduction

With this source and its locked dependencies installed in a writable environment:

```sh
npm run format:check
npm test -- --maxWorkers=2
npm run build
```

The actual cloud command invokes the same complete selection declared by `package.json`:

```sh
node node_modules/vitest/vitest.mjs run \
  test/integration test/unit test/components test/services \
  test/lighthouse-config.test.js test/security \
  --config /dev/shm/relay17-rf297-acceptance-evidence/vitest.config.mjs \
  --maxWorkers=2 --reporter=default --reporter=json \
  --outputFile.json=/dev/shm/relay17-rf297-acceptance-evidence/vitest-results.json
```

Node 24.19.0, Vitest 4.1.10 and the existing React/jsdom stack executed the tests. The retained dependency installation was reused only after `package.json`, `package-lock.json`, the repository Vite config and `test/setup.js` matched exactly. The temporary config imports the original repository config and changes only `cacheDir`. `TMPDIR` was also redirected into task-owned scratch because the root filesystem was full. These path substitutions do not alter test discovery, setup, assertions or timeouts. The archive includes the exact wrapper/config and full commands.

## Audit freshness and validation limits

The reused audit actually ran from 2026-10-04T11:56:36.112260Z to 11:56:56.026595Z in the concurrently executing PR298 validation with `npm audit --audit-level=critical --json --fetch-retries=0 --fetch-timeout=20000`; it exited 0. Dependency identities are unchanged:

- `package.json`: `625d0f3895fcc7afbfcfa131713249f5cd65dcd6`.
- `package-lock.json`: `70d29c1865dac7ce76ba7d4e6ca5ee454be54aae`.

Both source trees were checked to contain those exact dependency bytes before reuse. The source commit's earlier audit note refers to the 10:00:59Z receipt; this immediate documentation child supplies the newer shared audit without repeating the network request. The donor run receipt is included for provenance; its PR298 application test/build results are not claimed for PR297.

That receipt reports **20 high, 12 moderate and 2 low findings**, with 0 critical. This work does not claim those 34 noncritical findings are repaired or that PR297 performed an independent advisory scan. The original machine-readable audit output and donor run receipt are preserved unchanged; the reused-audit receipt extracts its audit fields and records the checked dependency identities.

This is local application/build evidence using the repository's demonstration wallet and transfer service. It does not establish a live payment, provider transaction, signing or settlement. React/Vite/Router and environment warning output remains in the raw logs. No warning-free, hosted CI, Lighthouse performance or production deployment result is claimed. The prior full-suite baseline was not repeated; the source changes reuse the already-established fixture repairs.

## Raw evidence

- [Machine-readable receipt](receipt.json): source and file identities, commands, counts, timings and archive/member digests.
- [Raw evidence archive](evidence.zip): 16 entries, including unmodified Vitest JSON/output, formatting/build output, shared audit evidence and complete source/composition manifests.
- ZIP bytes: `60612`.
- ZIP SHA256: `838969807560e6854a77c084694bf730e13ecd792046d2ad9d82860a358ec450`.

Original contribution, claim, branch and publisher custody remain intact.
