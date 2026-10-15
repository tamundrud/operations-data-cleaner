# U2 verification and CE review

Implementation is complete for the CSV-only U2 scope. Automated Chromium verification passes. The full prescribed CE code-review spine completed, followed by caller-owned fixes and verification. **U2 acceptance remains pending real operator/user UX feedback and outstanding Firefox/WebKit verification.** No U3 work, merge or deployment is authorized by this report.

## Baseline and workflow evidence

Remote `main` was fetched before implementation and matched `a4440c7dccbc63c37d90060b84c2443e4c155efc`, the merged U1 qualification. Starting checkout/index were clean, with no pre-existing unpublished commits. Work is on `feat/u2-csv-conversion`. Read the installed `ce-work` skill and its input-triage, work-intake, workspace-setup, execution-engines, execution-strategy, implementation-loop, shipping-workflow and review-findings-followup references. Native inline execution was selected for this single dependent unit. The plan body is unchanged.

Proof-first evidence: the initial fidelity/download unit test failed because the CSV adapter did not yet exist. It passed after implementation. Existing U1 qualification files were inspected; their isolated Excel probes were not rerun because no U1/Excel code changed. U2 has independent production CSV tests.

The required simplification pass collected three reviewers (reuse, quality, efficiency). Applied five supported improvements: cached exception-row selection, template header-only retention with full validation, removed unused issue payloads, reused the narrowed copy source, and clearer value display. Reuse found nothing further to consolidate. Safety checks were preserved. Type/lint/unit/browser checks passed after these changes.

## Completed CE review

Actual invocation: `ce-code-review mode:agent depth:full base:a4440c7dccbc63c37d90060b84c2443e4c155efc plan:docs/plans/2026-10-11-1607-feat-operations-data-cleaner-plan.md`.

Run ID: `20261013-180257-5ccda4b0`. [Original receipt](review.json): `status: complete`, `verdict: Ready with fixes`. [Completion evidence](completion-evidence.json), [stage log](stages.jsonl), [metadata](metadata.json), merged findings and validator artifacts are archived unchanged here. Their original absolute scratch paths identify the run at execution time; this directory is the portable archive. Review scope was staged/working-tree U2 code before fixes, not a later commit SHA. The original receipt is not rewritten to claim a second review of the fixes.

All nine selected reviewers returned terminal outcomes: correctness, project standards, testing, maintainability, security, performance, reliability, adversarial, frontend races. Prescribed merge, independent finding validation and report leaves completed. Seven raw candidates became five findings, all confirmed. `metadata.cost.status` is `complete`. Security, standards and performance reviewers retained no findings. No required reviewer dispatch/collection or finishing phase was skipped.

**Cross-model limitation:** Codex host was attested, but only the Codex CLI was installed. Claude/Grok/Cursor/OpenCode CLIs were absent, leaving no eligible different-provider route. The skill's prescribed local adversarial fallback completed. No external peer review or peer receipt is claimed.

## Findings and fixes

| Finding | Severity | Correction and evidence |
| --- | --- | --- |
| 1 — Repreview after column removal crashes | P1 | Hide prior results while processing; commit a sample's configuration with its matching successful import. Two real browser regressions failed before fixes, then verified removal/repreview and wider-preview → sample downloads without page errors. |
| 2 — Late cancelled-read rejection clears newer state | P2 | Apply the same sequence check to rejected reads as successful reads. Deferred-read regression failed with an empty busy state before the fix, then passed with the newer import intact. |
| 3 — Worker failure recovery untested | P2 | Added controllable transport/fake-clock tests for error, unreadable-message and watchdog paths. Real parser/engine/serializer produce restored rows and exact downloaded bytes; transport is mocked only for failure timing. Real worker/browser cancel and retry tests remain. |
| 4 — Failed sample import overwrites mapping | P2 | Candidate sample configuration is now committed only on its successful request/dataset response; a failed read retains the active mapping and visible error. Browser regression failed before fixes, then passed. |
| 5 — Cancelled sample mismatches preview and export | P2 | Removed the unrelated pending-view effect; cancel keeps the previous file/configuration. Browser regression failed before fixes, then verified matching recovered preview/header/download. |

All five findings were applied inline by the caller; none rejected or deferred. The caller also closed the review's narrower formula-choice testing gap with a new-source upload regression. The caller improved the observed desktop layout gap: source, mapping and output are adjacent at 1366px, with a two-column 1024px layout and a stacked narrow layout. Automated accessibility and rendered layout checks were rerun. These observations are agent/browser evidence, not operator feedback.

## Final verification

- `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`: pass; 41 unit tests in seven files.
- `U2_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium`: **16/16 pass**, against final production assets. Includes real downloaded bytes, mapping/template/sample journeys, malformed/header/required-data errors, raw/escaped representations, full counts, off-preview exception navigation, replacement/cancellation/recovery regressions, storage/network privacy, WCAG checks and keyboard controls.
- Privacy/performance scripts select the same cases already executed in that full browser run. Context interception precedes load, blocks service workers and unknown paths/methods/WebSockets, inspects sentinels in request URLs/headers/bodies and diagnostics, checks empty storage, and verifies production CSP separately.
- `npm audit`: zero known vulnerabilities in the exact pinned tree. Registry integrity, declared upstream/license metadata, build compatibility and production license texts are recorded. This is not a guarantee against undisclosed vulnerabilities.
- `npm run test:e2e -- --project=firefox --project=webkit`: **32 launch failures**, because the binaries are absent. Playwright installation was attempted; `cdn.playwright.dev` returned `403 Domain forbidden`. No app assertions ran in those browsers and no policy bypass was attempted. CI installs/runs all three browsers; its outcome is separate from local success.
- Visual check: production sample at 1366×900 and 390×844 inspected; automated layout/WCAG checks at 1366, 1024 and 390px passed with no page-width overflow. Screenshot artifacts stayed in scratch; no screenshot is presented as user approval.

[Recorded initial measurements](../../decisions/u2-performance.json) use Debian 13, AMD EPYC 9V74 (three exposed vCPUs), 8 GiB cgroup limit, Node 24.19.0/npm 11.9.0 and system Chromium 154.0.8037.57. All 10,000 rows × 20 columns were verified from actual downloaded data in six trials. Full import-through-export median/worst of five warm runs: **656/685 ms**; cold including automated mapping setup: **1665 ms**. 499 rows × 20 columns import-through-ready-preview: cold import + evaluation excluding manual mapping **448 ms**, warm median/worst **182/208 ms**. UI automation overhead is included. These pass cloud smoke budgets; the proposed reference laptop and full release qualification remain unmeasured.

## Acceptance and user UX checkpoint

U2's automated CSV baselines for AC-01/08/11/16/17/20/21/22 are demonstrated in Chromium; later-unit variants are not claimed. The runnable UI, deterministic engine, strict finite version-1 schema, text validation, counts/provenance, explicit CSV safety and synthetic example are delivered. Source data is not persisted or transmitted. Excel, advanced transformations, saved workflows, suggestions, corrections and partial export remain outside this change.

**User UX approval: pending.** Run `npm ci`, `npm run build`, `npm run preview`, then open http://127.0.0.1:4173. Try sample data gives an immediate working example. For the checkpoint, begin a fresh session with `examples/u2/source.csv` and `examples/u2/template.csv`; attempt mapping, rename/reorder, inspection and download using only interface cues. Record confusing next actions, source/output distinctions, unmapped/error handling, visible export/safety settings and keyboard operation. Material reported friction must be corrected and retested before accepting U2 or advancing to U3. No suitable operator was available in this execution, so automated tests and agents do not close that gate.
