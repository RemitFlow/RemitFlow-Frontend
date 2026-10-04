# RF296: existing CI gates restored

The complete package test selection passes on
[`17dd96c4593fcd599286d263ed7cb72f6a4b7c20`](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/17dd96c4593fcd599286d263ed7cb72f6a4b7c20):
**485 passed, zero failed, zero skipped or pending, across all 49 files**.
The original [PR296](https://github.com/RemitFlow/RemitFlow-Frontend/pull/296)
and its prior quote-freshness, locale, balance, wallet, and connection repairs
are preserved.

[Issue279](https://github.com/RemitFlow/RemitFlow-Frontend/issues/279) explicitly
requires existing tests and CI to remain passing. This continuation repairs the
four files behind the twelve previously recorded failures and the existing
formatting gate. One genuine product error was corrected: an already-valid
amount that cannot be priced now receives a pricing explanation instead of an
instruction to enter a positive amount.

## Executed results

| Gate                               | Result                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Existing Prettier check            | Passed with Prettier 3.9.6; fifteen flagged files formatted, configuration and ignores unchanged                                |
| Complete package test selection    | 485 passed / 0 failed / 0 skipped, all 49 files passed                                                                          |
| Test duration                      | Vitest reported 54.94 seconds; complete process took 55.56 seconds                                                              |
| `npm audit --audit-level=critical` | Exit 0; zero critical vulnerabilities                                                                                           |
| Remaining audit findings           | 20 high, 12 moderate, 2 low                                                                                                     |
| `npm run build`                    | Exit 0; Vite reported 1.46 seconds, complete command took 1.99 seconds                                                          |
| Source identity                    | All 348 tracked file blobs and modes matched the published tree before execution; tracked contents remained identical afterward |

The [earlier recorded run](https://tokenjunkielabs.slack.com/archives/C0BVANHNB26/p1791106741866919)
at `6fe01b6fd00f4063dfa1dc7c0ea826d4f3ac2077` had 473 passing and 12 failing
tests across the same 49 files. That observation was retained, rather than
rerunning the old complete suite. The corrected source was executed once as a
combined suite. Existing tests and strict money assertions were retained. The
combined run used no retries, exclusions or skipped cases, and added or changed
no snapshots.
These durations describe validation commands on this host, not application or
network performance.

## Repairs included

| Contribution                                                                                                        | Preserved behavior and correction                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`84510d0b`](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/84510d0b9d50d8178d287c4acccc16903cad77e4) | Honest null-price feedback; precision fixtures traverse review, confirmation, result and receipt navigation. Exact amounts, fee/rate payloads, receipt reconciliation, rejection and no-create assertions remain.                             |
| [`eb89ddb3`](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/eb89ddb3dd3f7b128ce29e9f3e79f676a1478d05) | Offline/reconnect fixtures use the real confirmation flow. Offline blocking, no automatic resubmission, explicit recovery, exactly-once creation and unknown-status handling remain asserted.                                                 |
| [`9f4f56fb`](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/9f4f56fbc0470e3824be7b95234c429cfa8d1089) | Pending-wallet assertions locate the Sending button inside the confirmation dialog; the unrelated demo-wallet random refusal is deterministic. Existing submission locks, native-submit and retry checks remain.                              |
| [`4f74e1fa`](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/4f74e1fa9add4e0f541b9c565d35df17e7800427) | Strict canonical-decimal expectations match the existing parser contract. The original USD 0.30 case retains exact fee, remainder and rounding checks; a below-fee USD 0.20 example retains zero clamping. Product pricing code is unchanged. |
| [`17dd96c4`](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/17dd96c4593fcd599286d263ed7cb72f6a4b7c20) | Only the existing formatter's output on the fifteen flagged files; all other 333 tracked blobs unchanged.                                                                                                                                     |

The affected maintained files also passed individually before composition:
precision 7/7, offline/reconnect 6/6, form 7/7, and quote 2/2. The combined
execution above covers the subsequently formatted source.

## Environment and reproduction

Execution used Node 24.19.0 and Vitest 4.1.10 with the retained matching
installation. The package manifest and lockfile were unchanged. The complete
test selection is exactly the one in `package.json`:

```bash
npm test -- --maxWorkers=2
npm audit --audit-level=critical
npm run build
```

Run these after installing dependencies from the committed lockfile. The local
execution additionally selected the default and JSON reporters, used a dedicated
temporary directory, and imported the repository's Vite configuration with only
`cacheDir` overridden to isolate writable files. There were no altered test
timeouts, exclusions, retry settings, snapshots, or dependency installs for this
aggregate run. The exact command and temporary configuration are in the evidence.

The mounted-app tests use the repository's demonstration wallet and transfer
service in jsdom. Raw output retains its React/Vite warnings. The audit passes
the workflow's critical threshold while retaining the noncritical findings above.

## Hosted status and retained evidence

At the executed source, GitHub reports `action_required` for both
[CI](https://github.com/RemitFlow/RemitFlow-Frontend/actions/runs/37194208479) and
[Lighthouse CI](https://github.com/RemitFlow/RemitFlow-Frontend/actions/runs/37194208458).
The current GitHub connection reports pull-only upstream permissions.
These are local gate results; hosted workflow approval and maintainer acceptance
remain external steps. The existing PR-description handoff and contributor
custody are preserved.

[receipt.json](receipt.json) records source identities, commands, timestamps,
results, artifact hashes and hosted status. [evidence.zip](evidence.zip) preserves
the original complete Vitest JSON/output, the source manifest and execution
wrapper, audit JSON, build output, and formatter before/after logs and diff.
The archive's SHA-256 and each member's hash are in the receipt; raw execution
files in the archive are unchanged.

The work was published to the existing contribution without force pushes.
