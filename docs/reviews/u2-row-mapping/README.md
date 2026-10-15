# U2 row-aligned UX revision

2026-10-13. Existing draft PR #2, `feat/u2-csv-conversion`. **UX checkpoint remains pending user/operator hands-on approval. U3 has not started.**

## Result and interaction decisions

The main workspace now has a searchable source palette and ordered destination rows. Each mapped source stays immediately beside its destination header. Dragging establishes or replaces a copy mapping; sources remain reusable. Native source selects and select-source → Match are keyboard/click alternatives. Output names edit inline; move/remove/unlink controls stay on their row. Validation is secondary. Template replacement requires a deliberate choice and a failed template leaves the existing mappings intact. Adding one column focuses its name; a secondary bulk-entry disclosure supports longer schemas. No connector lines, graph state, expression editor or DnD library was introduced.

Source and destination lists scroll independently: alignment belongs to each destination row, so a mapping does not depend on a separately positioned source endpoint. The 25-source/30-output test confirms source search/reuse, ordered exported data and alignment at 1440px/1024px. This verifies behavior/layout, not usability acceptance.

Mapping, naming, ordering and validation edits immediately revoke export eligibility and the previous formula-safety choice. A 250 ms quiet period precedes full-dataset evaluation. The UI queues the newest draft while an older evaluation runs; only the submitted current generation can clear dirty state. Stale preview rows and headers are hidden together. The callback rechecks idle/recovery/generation before submission. Busy indicators and cancellation/retry remain available. There is no mandatory preview-refresh button. Zero outputs show an explicit add/template instruction rather than a false processing state.

The transformation engine, format adapters, workflow schema and session/protocol contracts are unchanged. Both app entry points import a small Zod `jitless` configuration before constructing schemas. Firefox exposed the dependency's caught dynamic-code probe as CSP diagnostics; the configuration suppresses that probe without relaxing CSP or changing validation rules. See [decision](../../decisions/u2-automatic-preview.md) and [scoped plan addendum](../../plans/2026-10-13-u2-row-mapping-revision.md).

## Screenshots

Production build, synthetic data only. Inspected the exact running workspace at these widths:

- [Desktop — 1440px](desktop-1440.png)
- [Laptop — 1024px](laptop-1024.png)
- [25 sources / 30 outputs — desktop board](25-sources-30-outputs-desktop.png)
- [25 sources / 30 outputs — laptop board](25-sources-30-outputs-laptop.png)

A 390px fallback also passes the automated no-page-overflow and WCAG checks. Mobile editing remains outside the release requirement. No screenshot or agent test closes the operator UX checkpoint.

## Final verification

Supported Node **24.21.0**. `npm run typecheck`, `npm run lint`, `npm run test:unit` (**41 tests**), and `npm run build`: pass. Production Chromium **24/24** and Firefox **24/24** pass: **48/48**, no skips/flaky/unexpected results. [Structured evidence and timing trials](verification.json) records build assets and browser versions.

Actual final browser command:

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/u2-final-supported-results.json npm run test:e2e -- --config=tmp/u2-playwright.config.ts --project=chromium --project=firefox --output=tmp/u2-supported-test-results --reporter=list,json
```

Node 24's bin directory was selected for these commands. The ignored temporary config imports the repository config, sets the test directory/output paths and enables reuse of the already-running local production server at 4173. No committed runner configuration changed. In a clean environment with that port free, run the ordinary `npm run test:e2e -- --project=chromium --project=firefox` after `npm run build`.

Coverage preserves exact CSV download bytes/data, leading zeros/whitespace/quotes/newlines, full counts/provenance, formula choices and their invalidation, invalid/unmapped blocking, failed source/sample replacement, cancel/retry, worker recovery, privacy interception and empty storage. New checks include drag reuse/replacement, keyboard selection/focus, source search, 25/30 layout/order, direct add, template confirm/cancel/failure, debounce interval/reset, edits during delayed evaluation, cancellation with a newer draft, failed automatic-run suppression/retry, and zero-output states.

Privacy tests intercept the whole browser context before application load, allow only production static assets, reject unexpected requests/WebSockets and inspect sentinel values, diagnostics and storage. The revised path exercises drag/search/unlink/reorder/name edits. The unchanged restrictive production CSP is checked separately. Both browser privacy cases pass, with no unexpected diagnostics or requests.

Each browser verifies 10,000 rows × 20 columns from actual downloaded data in six trials. Warm full-pipeline median/worst: Chromium **952/1020 ms**, Firefox **862/971 ms**. Under-500-row warm import-through-preview median/worst: Chromium **240/274 ms**, Firefox **320/430 ms**. These include automation overhead, pass existing smoke budgets and do not qualify the reference laptop.

**WebKit incomplete:** the attempted 20-case run failed at launch because `libavif.so.16` is absent. No application assertions ran. System packages/browser dependencies were not changed. WebKit/CI evidence and reference-device qualification remain separate obligations.

An earlier simultaneous Chromium and Firefox run collided in Playwright's shared output directory, causing a Chromium trace-file teardown failure. Final runs were sequential with separate output directories and passed. A newly added clock test initially advanced real time; fixing the test to pause its clock made the 249 ms/reset/250 ms assertions deterministic. No production assertion was weakened.

## Mandatory Compound Engineering review

Actual invocation: `ce-code-review mode:agent base:bd89c6a plan:docs/plans/2026-10-13-u2-row-mapping-revision.md`. The depth gate selected the **full spine**. [Original receipt](ce-review/review.json): **status: complete**, run ID `u2-20261013`, verdict **Ready with fixes**. [Stage log](ce-review/stages.jsonl), [metadata](ce-review/metadata.json) and reviewer/merge/validator artifacts are archived unchanged. `metadata.cost.status` is complete.

All eight selected local personas returned terminal outcomes: correctness, project standards, testing, maintainability, security, reliability, frontend races and adversarial. The prescribed merge leaf, one independently dispatched finding validator and report leaf completed. No required local phase remains incomplete. Tests identified by reviewers for template replacement, debounce timing, automatic failure/recovery and cancel-with-newer-draft were added and verified.

**Review capability limitation:** the orchestration first stopped at an agent usage limit and resumed after the user asked to continue. The independent Claude route was attempted but its shared transport failed before egress: npm `ETARGET` for the skill's pinned `acpx@0.19.4`. No reviewed code reached Claude and no external model receipt is claimed. The skill's prescribed local adversarial fallback completed; the terminal job was collected and cleaned up. No provider substitution or transport-policy bypass occurred.

The sole confirmed actionable finding was **#1 (P2), empty destinations falsely showing indefinite automatic updating**. A real browser regression failed before correction. The caller retained the empty-field evaluation/export guards and added an explicit instruction; first upload and last-output removal now pass in both browsers. The receipt describes the pre-fix review, not a second independent review of the fixes.

The caller also reproduced a keyboard-focus defect beyond the retained CE finding: after keyboard Match, removing that action from the DOM lost focus. The new focused-select assertion failed before correction; Match now moves focus to the row's persistent source select and passes in both browsers. A submission-time idle/recovery/generation recheck was added, and the expanded delayed/cancelled-run tests verify final exported bytes. No actionable review finding remains unapplied.

The preceding simplification pass collected reuse, quality and efficiency reviewers. Applied shared manual-header parsing, one source lookup per match and removal of superseded field/grid CSS; formatted the touched code. The same-source no-op suggestion was not applied because it would change existing safety-choice invalidation side effects during a behavior-preserving pass. Type/lint/unit/build and final browser checks passed afterward.

## Scope and acceptance

Existing `docs/reviews/u2/` receipts and the authoritative PRD/original plan remain intact; the user-directed addendum records the revised UX. Pre-existing untracked `.codex/` and the rejected `docs/design/u2/` prototype are excluded from commit/publication. No engine rewrite, U3 capability, dependency installation, merge, deployment or UX-checkpoint completion.

For hands-on review, build/serve this branch, open http://127.0.0.1:4173 and Try sample data. Then start fresh with the synthetic source/template, try drag and keyboard mapping, replacement/unlink, rename/reorder/removal and automatic output changes. Inspect errors and formula choices before downloading. Keep draft PR #2 open until the user approves the implemented UX.
