# Generated transfer receipt identity

`createTransfer` now applies caller transfer details before its generated `id`, initial `pending` status and creation timestamp. Those fields are owned by creation, not by the request fingerprint. A caller-supplied record ID can no longer create a second stored row with a seed record's ID, and a supplied `completed` status or historical timestamp does not become the initial receipt metadata.

The change is limited to object assembly in the local mock API. The transfer contract, input amount normalization, idempotency fingerprint, in-flight sharing, saved-key replay and strict storage behavior are unchanged. This does not claim a server or live payment-provider vulnerability.

## Reproduction and result

Base: `91ccb2cb1071cae139f9be2d503395cb888d9f86`.
Tested source commit: `11a898caf3a1f05f985159bad387a7722f33c0e2`.
Source blob: `20606eda4770274d6876f038bd76383a8e6de7bd`.
Test blob: `de01c9bba5ca24ba0481440b3e700d96fb97b1b5`.
Runtime: Node `v24.21.0`, Linux, the repository's maintained Vitest/jsdom configuration and unchanged locked dependencies.

The regression submits valid transfer details together with `id: 'tx_1001'`, `status: 'completed'` and `createdAt: '2000-01-01T00:00:00.000Z'`, both with an idempotency key and through the legacy keyless path. The old assembly accepts the supplied ID, colliding with the existing seed receipt. The repaired assembly creates a distinct pending receipt with the current timestamp and preserves the original seed row.

On the original source, the new selection returned **2 failed / 1 passed**, exit 1; the 9 pre-existing cases were not selected in that baseline. The complete focused file on the repaired source returned **12 passed / 0 failed / 0 skipped**, exit 0, with 13.843 seconds recorded for the file. The replay control confirms that ignored metadata cannot alter an existing keyed receipt, including an in-flight replay.

```sh
node node_modules/vitest/vitest.mjs run \
  test/unit/create-transfer-idempotency.test.js --maxWorkers=1
```

[Execution and retained artifact](https://github.com/woahwhattheheck/RemitFlow-Frontend/actions/runs/37192132664). Artifact `11299641642`, ZIP SHA-256 `70edbc63bb9c3c79060adcc9a99d0384a633b050a82497b0b8d4b454557f4058`, contains the before/after JSON reports, commands, source hashes, exact changed files and patch. The isolated runner only published a validation ref; the original contribution branch was refreshed separately before integration.

No full suite, production build, real browser, backend, chain or live-funds execution was performed for this repair. Earlier PR results remain evidence for their own source revisions, not a rerun on this change.
