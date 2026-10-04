# Actor-scoped transfer validation

Issue: [RemitFlow Frontend #281](https://github.com/RemitFlow/RemitFlow-Frontend/issues/281)  
Existing submission: [PR #298](https://github.com/RemitFlow/RemitFlow-Frontend/pull/298)

## Problem and repair

The simulated localStorage API shares a transfer collection across wallets.
Previously, `listTransfers` validated that entire collection before selecting
the requesting actor's rows. As a result, the validity of a different wallet's
records could change this wallet's error behavior.

| Stored rows                                             | Before                                                   | Repaired behavior                        |
| ------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| Only a corrupt foreign-wallet row                       | Schema error for an empty current-wallet history         | Empty list                               |
| Valid current-wallet row and corrupt foreign-wallet row | Correct list, but foreign schema diagnostics were logged | Correct list without foreign diagnostics |
| Corrupt current-wallet row and valid foreign-wallet row | Empty list concealed the current wallet's schema failure | `ContractViolationError`                 |

The API now uses the existing `isVisibleToActor` predicate on raw rows before
validating individual transfers. It still passes a non-array top-level response
to the schema validator, so malformed response structure remains an error.
Visible corrupt records retain the existing validation policy.

The same visibility options are reused for the final search. Legacy records
without an actor remain visible only to the demo actor. The query actor is
normalized as before, while stored actor strings retain exact matching.
Cancellation, filtering, stable order and result caps keep their existing paths.

This changes the localStorage demonstration API; it does not establish a
server-side authorization boundary for an external service.

## Source and execution evidence

The repaired source commit is
[`935caeb37e3932f85c2555f9086bde2c771c20bd`](https://github.com/woahwhattheheck/RemitFlow-Frontend/commit/935caeb37e3932f85c2555f9086bde2c771c20bd),
a direct child of `21fccd57636a96d6c844289157e9c4693419a478`.
The preceding navigation and capped-selector changes are preserved.

| Executed file                             | Git blob                                   |
| ----------------------------------------- | ------------------------------------------ |
| `src/services/api.js`                     | `1ec5dcd1f163d536c2f2cb6059fa6218c92f7d41` |
| `test/unit/list-transfers-search.test.js` | `2d2c4753103589a1c53421a7e8a66734f566e0ef` |

Two focused executions completed on 2026-10-04:

- **Direct production API replay: 9 passed, 0 failed.** Node 24.19.0 imported
  the changed API and actual contract modules, using synthetic JSON through an
  in-memory localStorage interface and the API's real 400 ms timers. It covered
  the three reproduced failures, current-wallet corruption alone, valid mixed
  actors, demo and non-demo legacy visibility, a non-array response, and query
  trimming with exact stored actor strings.
- **Maintained unit file: 12 passed, 0 failed, 1.86 seconds.** Node 24.19.0 and
  Vitest 4.1.10 ran all five existing cases and seven added regressions together
  at the source commit above. No test cases were removed or weakened. The
  retained installed runtime's package manifest, lockfile, Vite configuration
  and test setup matched this checkout by Git blob; no source changes or new
  dependency installation were needed for that run.

Run the maintained selection from an installed checkout:

```bash
node node_modules/vitest/vitest.mjs run test/unit/list-transfers-search.test.js --maxWorkers=1 --fileParallelism=false
```

The observed run set `TMPDIR` to a writable task-owned tmpfs directory because
the shared cloud disk was full. An earlier dependency-install attempt in a
different checkout stopped with `ENOSPC`; it did not produce a test result or
change dependencies or lockfiles. Reusing the compatible installed runtime
closed that execution gap.

Both edited JavaScript files also passed syntax checks, and the source diff
passed whitespace checks. No repository-wide suite, production build, browser,
wallet or external-provider run was repeated for this repair. Earlier
[selector performance evidence](../performance/transfer-search-20261004/README.md)
retains its own source revision and measurement scope. These results establish
neither sponsor acceptance nor an award or payment.
