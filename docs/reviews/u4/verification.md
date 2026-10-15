# U4 implementation evidence

Synthetic fixtures only. Base: `origin/main` at `20f0e61`; feature branch `feat/u4-save-repeat-backup`. Pre-work tree contained only the U4 plan authored and approved in this conversation. Native CE execution selected; no external implementation binding/configuration. Plan-local work packets form a dependency chain and execute serially. No merge or deployment.

## Configuration boundary (local U1)

The delegated author added independent JSON/CRLF CSV goldens and codec tests before production changes. Initial focused execution failed because the codec module was absent. A second regression exposed a real encoded-byte-budget gap: compact JSON fit while pretty JSON exceeded 1 MiB (7 tests passed, 1 failed before correction). Actual serialized bytes are now checked.

Host inspected the actual tree and ran `npm run typecheck` and `npm run test:unit` with Node 24.21.0: both passed; 78 tests across 11 files. Commit `1f17d06` records the approved plan and U1 implementation. Focused author verification covered 43 tests across workflow roundtrip/workflow/sample/constants/CSV.

## Early production smoke

`npm run build` passed. `npm run test:e2e -- --grep 'basic|sample|production journey' --reporter=line`: Chromium and Firefox passed all 12 selected cases together. Six WebKit cases could not launch: the installed WebKit runner required missing host `libavif.so.16`; no application assertions ran for those six. Later integrated results supersede this baseline where available.

Runtime: Node 24.21.0 (explicit PATH), npm from that installation; Chromium for Testing 156.0.8078.4. Tests use existing production server/CSP. Cloud environment status tool/policy snapshot are unavailable on this local executor; no credential or network-policy alteration was made.

## Storage and session integration

The adapter's controlled tests cover abort after request success, denied/blocked opens, cancellation, late connection closure, corruption isolation, explicit identity/name collisions and exact-snapshot stale writes. Browser journeys additionally exercise native IndexedDB, two real tabs, real JSON downloads and storage failure without disabling ad hoc conversion. Commit `93ed147` contains the adapter and its tests.

Saving acknowledges only the captured configuration. Later name/rule edits retain an unsaved state. Activation ends the prior session and installs the selected definition before the next upload; session tests assert the prior file cannot be retried. Successful source imports commit their delimiter policy; pending controls and template imports do not overwrite it.

## Review and reproduced fixes

The full CE review completed nine local reviewer contexts plus an independent validator. Its immutable receipt is [ce-review/review.json](ce-review/review.json). One P2 concurrency defect was confirmed: Open/Import retained an activation callback from before an asynchronous read and could skip replacement confirmation after a newer edit or source upload. [activation-race-red.json](activation-race-red.json) records the failing regression before correction. Both handlers now use the latest callback. Dedicated delayed-import/source and delayed-saved-read/name regressions verify cancellation preserves the newer configuration, source and download.

The first follow-up run passed those regressions (16 of 17 total) and exposed keyboard focus loss on closing a collision dialog. [review-fix-chromium.json](review-fix-chromium.json) records that intermediate failure. The dialog now explicitly restores focus to the Save control on close. Final results below supersede that intermediate run.

The requested cross-model route could not resolve pinned `acpx@0.19.5` (npm ETARGET before egress). No alternate route or claim of different-model independence was used; a local adversarial fallback completed. Two early simplification delegates hit a temporary usage limit; the parent completed the behavior-preserving review inline. The existing shared codec and transaction/session guards were retained.

## Visual and operator evidence

`capture.mjs` ran against the production build using synthetic fixtures. [capture.json](capture.json) records editor widths 1440/1024/390 and repeat widths 1440/1024 with no page overflow or page errors and an actual converted CSV download. Backup and explicit collision dialogs were captured at desktop/laptop widths. Parent visually inspected the laptop repeat and collision views and the mobile editor: controls, field matching, preview and focus indicators are legible and contained.

Screenshots and automated journeys establish engineering evidence. They do not establish hands-on daily-operator acceptance, reference-laptop performance, release certification or TMS interoperability. No merge or deployment was performed.

## Final qualification

On the final runtime/test tree, Node 24.21.0: `npm run typecheck`, `npm run lint`, `npm run test:unit` (93 tests / 12 files) and `npm run build` all passed. Playwright 1.64.0 completed **69/69** selected cases, 23 each in Chromium/Firefox/WebKit, with zero failures, skips or retries/flaky results. [final-browser-matrix.json](final-browser-matrix.json) is the final result. Earlier full Chromium qualification passed 47/47 before the two callback/focus fixes; its broad editor/regression coverage remains in [chromium.json](chromium.json). The final matrix reran every affected U4 persistence, portability, accessibility, privacy and performance suite after those fixes.

```sh
export PATH=/home/trevor/.nvm/versions/node/v24.21.0/bin:$PATH
npm run typecheck
npm run lint
npm run test:unit
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/odc-playwright PLAYWRIGHT_JSON_OUTPUT_FILE=docs/reviews/u4/final-browser-matrix.json ./node_modules/.bin/playwright test tests/e2e/persistence.spec.ts tests/e2e/workflow-portability.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/privacy.spec.ts tests/e2e/performance.spec.ts --reporter=line,json
```

The `/tmp` browser path is a local harness workaround: copied WebKit launcher plus extracted Ubuntu libavif16/libgav1/libyuv libraries. System packages and repository dependencies were unchanged. On a normally provisioned machine, use the documented standard Playwright installation and omit this environment override.

| Browser | Rows × columns | Cold ms | Warm median ms | Warm worst ms |
|---|---:|---:|---:|---:|
| chromium 156.0.8078.4 | 10000 × 20 | 3109.4 | 986.3 | 1095.8 |
| chromium 156.0.8078.4 | 499 × 20 | 437.3 | 239.7 | 241.5 |
| firefox 157.0 | 10000 × 20 | 3806.0 | 880.1 | 976.9 |
| firefox 157.0 | 499 × 20 | 623.9 | 253.3 | 272.2 |
| webkit 27.2 | 10000 × 20 | 9380.0 | 1249.8 | 1304.2 |
| webkit 27.2 | 499 × 20 | 1087.5 | 731.0 | 877.3 |

All warm worst values met existing budgets (<5,000 ms for the full 10,000 × 20 pipeline and <1,000 ms for 499 × 20 import/preview). Full-pipeline cold includes manual mapping setup; small cold excludes manual mapping. Timings include UI automation overhead and describe this runner, not a reference laptop. Every large repeat and fresh-context portable export matched all independent expected bytes; U3's separate 10,000-row test also retained exact fixed values, decimal representation, trim behavior and provenance.

`tested-source.sha256` identifies the runtime, tests, scripts and fixtures used. No production edits followed this final run. `git diff --check` is clean outside the intentional byte golden `u4-expected.csv`, whose CRLF and literal boundary spaces must be preserved.

Acceptance: U4 engineering implementation and automated qualification complete; no unresolved confirmed code-review finding. User/operator review remains available through the draft PR and screenshots. Later master-plan units remain unimplemented.
