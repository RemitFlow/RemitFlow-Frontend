# Across-page deselection — 4 October 2026

Selecting every page used an implicit flag with an empty explicit-ID set. The first row toggle consequently selected only that row; a page toggle cleared all pages. The two handlers now materialize the frozen snapshot's IDs before removing the requested row or page. Other-page selections survive, and newer live rows are not pulled into the selection.

Production commit: `6ed4086fa9520c36639b5419a42145951a16cd9a`, a direct child of `afa3b0efb5c7e0bd2eee2e6123c1206e7c801ac8`. The existing early-stop lookup and its performance evidence remain unchanged. No dependency, workflow, or unrelated source changes are part of this fix.

## Focused execution

The existing `test/integration/select-all-across-pages.test.jsx` file has three unchanged cases and two new parameterized cases. Both new cases select seven transfers, move to the final page, deselect a row or that page, and verify that the five rows on the other page remain selected. They mount the real application under the repository's existing test configuration.

- Baseline component `3bb8747d62c1e9690f9a1559c7f6d73f792bd9d1`: **3 passed, 2 failed**; only the new row/page deselection cases fail.
- Candidate `d0e0940be428c1743c87f7f42e2eec48b60cca2d`: **5 passed, 0 failed**. [Paired execution](https://github.com/woahwhattheheck/RemitFlow-Frontend/actions/runs/37205575772) completed both test steps; its final formatting check failed on two ternary line wraps, subsequently corrected.
- Final composed production source `6ed4086fa9520c36639b5419a42145951a16cd9a`: **5 passed, 0 failed, 0 pending**; scoped Prettier check and clean-worktree check passed. [Successful final run](https://github.com/woahwhattheheck/RemitFlow-Frontend/actions/runs/37205924647).

Node **24.21.0**, npm **11.19.0**, unchanged lockfile installed with `npm ci --no-audit --no-fund`. Commands: `./node_modules/.bin/vitest run test/integration/select-all-across-pages.test.jsx` and `./node_modules/.bin/prettier --check src/pages/Transfers.jsx test/integration/select-all-across-pages.test.jsx`.

Executed blobs: component `d1d765c64e27832d46450fb2e5c7e5cbb5c7ca12`; selection test `f030d294dabe1f91f5fc66505f1a987b9ec4010c`; preserved snapshot helper `f12b9a0163b8d47b8d0e903764245ae18a1ea2a2`.

[Final raw reports](https://github.com/woahwhattheheck/RemitFlow-Frontend/actions/runs/37205924647/artifacts/11304383975), ZIP SHA-256 `e16c0ab61df0c9accc1fcc916bce057a7eb11d93d8a4921131c492fdb38f5d1a`, expire on 11 October 2026. The paired run's artifact is `11303953775`. An earlier controller-only failure in run `37205456958` incorrectly expected unquoted parameter names in the JSON report; the test counts were already 3 passed/2 failed. No production assertion was weakened.

These results cover selection interactions in the mounted test application, not a full build, complete suite, deployed provider, or payment acceptance. The temporary execution workflow stays on an isolated verification branch and is not included in the contribution.
