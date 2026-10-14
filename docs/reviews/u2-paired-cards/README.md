# U2 paired-card implementation evidence

October 14, 2026. Existing draft PR #2; U2 application acceptance remains pending hands-on user review. No U3, merge or deployment.

The [approved specification](../../design/u2/paired-cards/SPECIFICATION.md) and [interactive prototype](../../design/u2/paired-cards/prototype.html), committed at `f253df4`, are the design source. The [implementation plan](../../plans/2026-10-14-u2-paired-card-matching.md) replaces the superseded connector-line and row-form presentations.

## Implemented behavior

Sources and outputs match in either drag direction or through click/Enter counterpart selection. Green pairs group above unmatched cards. Sources remain reusable/searchable and show use counts. Whole pairs move by grip drag or Alt+Up/Down. Matching, rematching and unlinking preserve imported export order. Explicit pair movement permutes occupied matched slots while leaving unmatched slots fixed; Output order moves any field through the complete schema. Contextual settings keep advanced configuration secondary.

The production engine, workflow schema, validation, privacy/export guards and automatic preview scheduler are unchanged by this revision. Preview refreshes after the existing quiet period; pending/stale results and incomplete mappings block exports. Source samples preserve original strings. Settings apply live and automatically refresh preview.

## Screenshots

Production application, synthetic fixtures, original list scroll positions. Capture script: [capture.mjs](capture.mjs); [capture result](capture.json), no page errors. Compare directly with the committed prototype evidence.

| Scenario | Desktop 1440px | Laptop 1024px |
| --- | --- | --- |
| Approved six-source/six-output fixture, three matches | [Screenshot](sample-1440.png) | [Screenshot](sample-1024.png) |
| 25 sources / 30 outputs, ten matches | [Screenshot](25-sources-30-outputs-1440.png) | [Screenshot](25-sources-30-outputs-1024.png) |

## Verification

Node 24.19.0; installed system Chromium 154.0.8037.57; managed two-core Linux cloud runner. `npm run typecheck`, `npm run lint`, `npm run test:unit` (41 tests) and `npm run build` passed. Typecheck/lint also passed after the review test fixes.

Final production Chromium results: **24 functional tests passed**, plus **two timing tests passed** in an isolated run. [Functional JSON](final-functional.json), [performance JSON](final-performance.json). Checks cover both native drag directions, reuse/replacement/grouping/unlink, keyboard selection/focus/cancellation/status, upward/downward grip and keyboard reorder with unmatched slots, preview headers and exported data, full-schema movement, template order/confirmation/failure, external drops, contextual settings, 25/30 layout/search at 1440/1024px, accessibility, automatic debounce/in-flight edits/cancellation/retry and stale export blocking. Existing real downloaded-byte/data, formula-safety, provenance, privacy interception, diagnostic-sentinel and empty-storage assertions remain.

Commands used the existing production-server suite, with an ignored local config that selects the installed browser and extends runner timeouts (no product/timing thresholds changed):

```sh
U2_CHROMIUM_PATH=/usr/lib/chromium/chromium npm run test:e2e -- --config=tmp/playwright.local.config.ts --project=chromium --timeout=180000 --grep-invert '10000 x|499 x'
U2_CHROMIUM_PATH=/usr/lib/chromium/chromium npm run test:e2e -- --config=tmp/playwright.local.config.ts --project=chromium --timeout=180000 --grep '10000 x|499 x'
npm run preview
U2_CHROMIUM_PATH=/usr/lib/chromium/chromium node docs/reviews/u2-paired-cards/capture.mjs
```

The local config inherits `playwright.config.ts`, points `testDir` at `../tests/e2e`, allows an existing production server, uses a 120-second suite timeout and 15-second assertion timeout; the CLI uses 180 seconds. Individual performance tests retain their own timeout and smoke thresholds.

| Warm pipeline | Final median / worst | Unchanged worst budget |
| --- | --- | --- |
| 10,000 rows × 20 columns, import through CSV download | 1716 / 3007 ms | <5000 ms |
| 499 rows × 20 columns, import through preview | 443 / 630 ms | <1000 ms |

All six trials per scenario check actual downloaded data. Measurements include automation overhead; they do not qualify the reference laptop. [Final large timings](final-timings.json), [final small timings](final-small-timings.json). Earlier runs failed the budgets: 10,586/16,123 ms and 832/1475 ms respectively. Those results remain in [initial run](initial-browser-results.json), [targeted rechecks](rechecks.json), [large timings](timings.json) and [small timings](small-timings.json). Functional failures from the first run were resolved through deterministic clock/read gates and visible drag endpoints; no fidelity assertion or timing budget was removed.

Firefox and WebKit were attempted, but lacked their configured executables (`firefox-1555/firefox/firefox` and `webkit-2370/pw_run.sh`). Browser downloads from `cdn.playwright.dev` were denied with HTTP 403 / Domain forbidden. **No application assertions ran in either browser.** [Launch evidence](other-browsers.txt). Their suites are incomplete; older revision results do not qualify these changes. CI outcomes and hosted response headers were not verified here.

## Mandatory CE review

Explicitly loaded and followed `$HOME/.agents/skills/ce-work/references/shipping-workflow.md` and `$HOME/.agents/skills/ce-code-review/SKILL.md`, including required phase references. Invocation: `ce-code-review mode:agent base:f253df4 plan:docs/plans/2026-10-14-u2-paired-card-matching.md`. Criteria included the approved design, plan, PRD and root AGENTS.md.

**Complete:** prescribed seven local reviewers (correctness, project standards, testing, maintainability, security, frontend races, adversarial), synthesis, independent finding validation and report. The report agent resumed after a usage-limit interruption. [Original review receipt](ce-review/review.json), run `u2-paired-20261014`, status **complete**, verdict **Not ready**. CE simplification also completed: [four applied findings](simplification.md).

**Not run:** different-provider cross-model review; no eligible installed route existed on the Codex host. The prescribed local adversarial fallback completed. No external receipt or code egress is claimed. No required local review step remains incomplete.

Confirmed P2 #1 and both supplementary testing gaps were fixed, and the final affected tests pass. [Post-review fixes and verification](review-followup.md). No actionable finding remains unapplied. The original receipt preserves the pre-fix state and earlier failed timings; it is not rewritten as an independent post-fix approval.

## Remaining UX and acceptance limits

Incomplete mappings produce real workflow blockers and no illustrative partial output table; the prototype's simulated partial preview is not the production engine. Contextual settings apply live rather than staging an Apply action. Bounded lists match the approved layout; native drag across off-screen endpoints and manual screen-reader use still warrant hands-on qualification. Accessible click/keyboard alternatives are covered by automated tests. U2 still supports copy/text/required/max-length only.

Final visual polish, practical drag/focus comfort, Firefox/WebKit, CI and reference-laptop qualification remain open. Design direction approval does not close implemented application acceptance. PR #2 remains draft for user testing; draft CI babysitting, merge, deployment and U3 are not started.
