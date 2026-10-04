# PR298: required local checks pass on the composed source

The complete package selection passes on [1e702e64](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/1e702e6437deee1bc1b0d75f5a3189abd178a226): **504 passed, zero failed or skipped, across all 53 files**. The final tree is `50b2704afb930440c23d30f6ab1dd7bbbf7fbf85`.

[Issue281](https://github.com/RemitFlow/RemitFlow-Frontend/issues/281) requires existing tests and CI to remain passing without weakening unrelated tests. This continuation keeps the original [PR298](https://github.com/RemitFlow/RemitFlow-Frontend/pull/298), the earlier actor and navigation corrections, the bounded selector, and the later query-invariant filter preparation.

## Final executed gates

| Gate                     | Result                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Existing Prettier check  | Passed; existing configuration and ignores unchanged                                         |
| Complete package tests   | 504 passed / 0 failed / 0 skipped; 53/53 files passed                                        |
| Test duration            | Vitest 69.54 s; complete process 70.096 s                                                    |
| Production build         | Passed; Vite 1.75 s; complete command 2.078 s                                                |
| Critical audit threshold | Exit 0; zero critical findings                                                               |
| Remaining audit findings | 20 high, 12 moderate, 2 low                                                                  |
| Source identity          | All 355 tracked blobs matched before execution and remained unchanged after testing/building |

The final suite ran once with the complete package file selection, no retries, exclusions, altered timeouts or snapshot changes. It includes the original race, cancellation, actor-scope, pagination and scale cases and the new filter-preparation cases. Node 24.19.0 and Vitest 4.1.10 used the retained installation after package, lockfile, Vite configuration and test setup matched exactly.

The audit executed once at 11:56:36–11:56:56 UTC on 2026-10-04. The final composition has identical package/lock bytes, so that dated result was reused. It passes the workflow's critical threshold while retaining the 34 findings above.

## Changes and composition

The four maintained send/quote fixtures now traverse the actual review, confirmation, result and receipt flow and assert the existing canonical-decimal contract. Their 22 original case titles remain. Exact amounts, fees, receipt reconciliation, negative/unquotable input, offline blocking, retry and transfer-creation assertions are retained.

The only functional send-page change gives an otherwise valid amount with no available quote the pricing explanation expected by the maintained test. Required Prettier output covers the remaining flagged files. From the final parent 71746fa5, 19 paths change and 336 tracked paths remain unchanged.

A first composition passed 502 tests across 52 files. Before its publication, a concurrent selector preparation contribution advanced the original branch. A non-force update rejected the outdated parent with 422. Its five files were then incorporated, the two new report files were formatted, and the final 504-case composition above was executed. Both raw runs remain separately identified in the archive; the earlier result is not represented as the final source.

The peer selector `f072d7879d4bceb74d3635f6bfda0797e7f549a0`, benchmark script `1bcf4b3f4d44596fe3381d4631cde0481e85aca9`, and added test `cea83462b01de6fa1631a6bfeaa25fbdb522f980` are preserved byte for byte. Formatting of both historical benchmark JSON documents preserves every measurement and source pin.

## Performance evidence retained

The [earlier bounded-selector report](../../performance/transfer-search-20261004/README.md) and [query-invariant filter-preparation report](../../performance/transfer-filter-preparation-20261004/README.md) retain their own executed sources, environments, paired samples and scope. This continuation did not rerun either benchmark or combine their speedups.

The final package's scale and performance tests pass. The validation-command durations in this report are not application or network throughput measurements.

## Reproduce and inspect

From an installed checkout of the source commit:

```bash
npm test -- --maxWorkers=2
npm run format:check
npm audit --audit-level=critical
npm run build
```

The local test command used the default and JSON reporters and imported the actual repository Vite configuration with only `cacheDir` redirected to a task directory. `TMPDIR` and npm's cache/log locations were similarly redirected because the shared root filesystem was full. The exact wrappers/configuration are in the archive; dependencies were not reinstalled or changed.

[receipt.json](receipt.json) records commands, source identities, timestamps, hosted status and archive/member hashes. [evidence.zip](evidence.zip) preserves raw Vitest output and JSON, formatter output, audit JSON, build output, source manifests, exact diffs and the separately identified intermediate execution. Raw execution files in the archive are unchanged.

## Hosted and execution boundary

At the published source, [CI 37201143157](https://github.com/RemitFlow/RemitFlow-Frontend/actions/runs/37201143157) and [Lighthouse CI 37201143084](https://github.com/RemitFlow/RemitFlow-Frontend/actions/runs/37201143084) report `action_required`. Local gate results do not establish hosted approval or maintainer acceptance.

The app tests use the repository's demonstration wallet and transfer service in jsdom. The archive retains React/Vite warnings. No live-wallet, provider, settlement or whole-page performance result is established here. The original contribution and metadata handoff remain in place.
