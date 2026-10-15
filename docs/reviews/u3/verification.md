# U3 verification before CE quality review

Synthetic fixtures only. Base: `origin/main` at `7192c36`; new feature branch `feat/u3-fixed-trim-csv`. Initial checkout was clean and carried no commits beyond main. Native CE execution was selected: no external implementation binding or CE engine configuration exists. Local work packets form a dependency chain (engine/CSV, contextual UI, integrated proof), so implementation ran inline. No dependencies added.

## Evidence strategy

- Baseline: typecheck, lint, build, 41 unit tests and 24 production Chromium functional tests passed.
- Engine proof first: new constants/trim/CSV-options tests ran before production edits: 26 failed, one incompatible-configuration test passed. Failures were the expected U2 unsupported recipe/settings/output guards. After implementation, all 68 units passed.
- UI proof first: `U2_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium tests/e2e/constants.spec.ts --grep "intentional required" --reporter=line` failed waiting for the absent fixed-value control before UI implementation.
- Initial UI runs exposed labels that included select options or textarea contents. Reproduction confirmed exact labels were ambiguous; explicit accessible names fixed them. The six U3 browser tests then passed (20.6s), and the combined 30 functional tests passed (1.1 minutes).
- Synthetic sample proof first: the new sample unit failed with missing `examples/u3-workflow.json` before the fixture was created. All 69 units then passed.

## Current results

`npm run test:unit`: 69 tests / 10 files passed. `npm run typecheck`, `npm run lint`, `npm run build`: passed. A capture-script lint failure for browser globals was corrected by evaluating the HTML element directly; lint passed afterward.

`U2_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium --reporter=json > docs/reviews/u3/chromium-initial.json`: 34 passed, 0 failed/skipped/flaky, 87.7s. The npm preamble was removed from the JSON artifact; no test payload was changed. This includes new U3 sample, twelve browser byte combinations, constants/type/reorder/trim/validation, formula-choice renewal, pending-run edits, constant-sentinel privacy, existing U2 regressions and full dataset performance/fidelity.

`U2_CHROMIUM_PATH=/usr/bin/chromium npx playwright test tests/e2e/accessibility.spec.ts --project=chromium --grep "U3 fixed" --reporter=json > docs/reviews/u3/accessibility.json`: 1 additional accessibility test passed (4.0s), covering the configured workspace and fixed/trim dialogs at 1024px. No production changes occurred between these runs. Both axe and existing 1440/1024/390 layout checks passed.

System Chromium 154.0.8037.57; Node 24.19.0/npm 11.9.0; managed Linux cloud runner, not reference-laptop qualification. Existing 10,000 × 20 cold trial 2613ms; five warm full import-through-download runs median 650ms, worst 732ms (<5000ms). Existing 499 × 20 import-through-preview median 181ms, worst 197ms (<1000ms). Full measurements are retained in `timings.json` and `small-timings.json`. The U3 10,000-row test checks every downloaded fixed/trimmed value and original reference, counts and paginated provenance.

## Browser limits

`npx playwright install chromium firefox webkit`, `npx playwright install firefox webkit` and `npx playwright install webkit` were attempted separately. Downloads from `cdn.playwright.dev` and Firefox/WebKit fallback `playwright.download.prss.microsoft.com` returned HTTP 403 / Domain forbidden. No network-policy workaround was attempted.

`npx playwright test --project=firefox --project=webkit --grep "U3 sample" --reporter=json > docs/reviews/u3/other-browsers.json`: 2 launch failures, absent `firefox-1555/firefox/firefox` and `webkit-2370/pw_run.sh`. No application assertions ran. GitHub CI retains all three browser projects; its result must be recorded separately for the PR head.

## Screenshots

`npm run preview`, then `U2_CHROMIUM_PATH=/usr/bin/chromium node docs/reviews/u3/capture.mjs`. Captures at 1440×900 and 1024×900 include the workspace, completed constants/intentional blank, fixed-number dialog and trim dialog. The script verifies exact U3 sample download bytes, no page-width overflow and no page errors. `capture.json` records observations. Screenshots are engineering evidence, not user UX approval.

## Remaining gates at this checkpoint

CE simplification, code review, finding validation and final PR delivery follow this checkpoint. No merge, deployment or U4 work is authorized. The U3 UX remains pending personal user testing.
