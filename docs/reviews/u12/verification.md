# U12 verification and UX acceptance handoff

Scope: [approved master plan, U12](../../plans/2026-10-11-1607-feat-operations-data-cleaner-plan.md#u12-full-exception-review-and-acknowledged-partial-export), R4/R6, FR-22/25/44, AC-15. Based on fetched `main` commit `503644617a31b11760d35e801dced2be64445925`. The starting checkout had no changes or unpublished commits. Dedicated branch: `feat/u12-exception-review-partial-export`.

The installed `ce-work` definition was available at `$HOME/.agents/skills/ce-work/SKILL.md`. Native skill invocation was not exposed; its filesystem definition and phase references govern this run. Artifact root defaults to `docs`; no project or local CE configuration overrides were present. Native inline implementation was selected for this single dependent unit. The original plan body and approved product/paired-card decisions are unchanged.

## Behavior and evidence strategy

Inspected existing session, counts, format, correction/reupload, accessibility and privacy tests before behavior changes. New serializer tests first failed because invalid rows were universally blocked instead of supporting acknowledged partial exports (2 expected failures). The session lifecycle test first failed because an unacknowledged partial export was sent to the worker. The browser scenario first failed on the missing excluded-row filter. These failures were observed before their respective implementation changes.

Both serializers now share one eligibility gate. Workflow errors and zero eligible rows always fail; invalid rows require explicit permission and are never serialized. The controller resets permission for source changes, corrections, rule/output edits, cancellation and recovery. The worker independently checks dataset/revision and passes permission to the serializer. CSV formula handling remains a separate explicit choice. Permission and review filters never enter workflow JSON.

The review retains full-dataset counts and 50-row pagination. Every issue shows source record/physical line (plus worksheet for Excel), field, severity, reason and suggested action. Operators can filter all exceptions or only invalid rows. Acknowledgement states the exact eligible/excluded counts and includes warning-only records. Excluded counts describe the acknowledged download; before permission they remain zero.

Synthetic browser evidence checks 500 candidates → 490 exact CSV/Excel records, including a warning-only record, with all 10 excluded references. It also checks more than one exception page, keyboard operation, desktop/mobile Axe and overflow, acknowledgement invalidation, saved-workflow reuse, worker revision rejection, privacy interception and 10,000-row partial-export completeness. All fixtures are synthetic, including the `PRIVATE_U12` privacy sentinels visible in screenshots.

## Screenshots for UX acceptance

- [Review and unchecked acknowledgement, desktop](screenshots/partial-review-desktop.png)
- [Second page of excluded records, desktop](screenshots/exclusions-1280.png)
- [Second page and checked acknowledgement, mobile](screenshots/exclusions-390.png)

Review the exclusion wording, separate CSV safety choice, filter/page controls and correction recovery path. Automated accessibility and file assertions do not constitute UX acceptance.

## Environment limits

Local production verification uses Node 24.19.0 and installed system Chromium. The network policy denies Playwright's browser-download domain; Firefox/WebKit are not locally available. Existing CI retains all three browser projects. Cloud timing is smoke evidence, not reference-laptop qualification. U13, downloadable exception reports, deployment, merging and full-MVP/release qualification are outside this change.

Runtime: Chromium 154.0.8037.57 on Debian 13; Linux 6.18.55; AMD EPYC 9V74 host, 2 available logical CPUs, approximately 10 GiB visible memory. These are cloud-container observations, not a physical reference laptop specification.

## Regression discovered and resolved

The first full Chromium run passed 106 of 107 cases. Existing U10 precision-error recovery failed: clearing acknowledgement inside `configure` emitted an idle state with the previous export error before the new evaluation's busy state. The UI's generation observer consumed that transition and left the preview marked stale. A new session-observer regression reproduced the idle notification before the fix. The reset is now part of the same state update that starts processing; pagination/download retain permission. The original U10 recovery case and all 15 focused Excel/U12 cases then passed. This was repaired without changing precision rules or weakening the browser assertion.

## Final verification on the simplified production code

| Check | Result |
| --- | --- |
| `npm ci` | Passed; pinned lockfile/vendor distribution, no dependency changes |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test:unit` | 289 passed across 23 files |
| `npm run build` | Passed |
| `U2_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --project=chromium --reporter=list,json` | 109 passed; 0 skipped, 0 flaky, 0 unexpected, 5.3 minutes |

The full browser run includes existing production privacy/performance, persistence/portability, date/decimal/CSV/Excel, correction/reupload, accessibility and approved paired-card mapping checks. See [unit log](unit-results.txt), [Chromium log](chromium-results.txt), [structured browser summary](browser-results.json), [U12 request-interception result](partial-export-privacy.json), and [10,000-row partial timing](partial-10000-timing.json). The review-requested workbook-source provenance extension is recorded separately below after its focused verification.

## CE review and follow-up

[Full review receipt](code-review/review.json), run `20261019-023009-68f8dd2d`: `status: complete`, nine completed local lenses, zero findings/actionable findings, no failed reviewers. Review covers correctness, project standards, tests, maintainability, export contracts, reliability, frontend races, adversarial inspection and relevant Excel learnings. No different-family route was available; local adversarial fallback completed. The receipt's static “Ready to merge” verdict is not merge permission or UX acceptance.

The sole coverage recommendation was applied inline: an independently authored synthetic workbook has its header at row 3, a skipped blank row 5, 60 invalid rows spanning two exception pages, and a cached-formula warning-only row. The added test verifies all 60 worksheet/original-row references, exact full counts, retained permission across pages, and exactly the two eligible CSV records. `U2_CHROMIUM_PATH=/usr/bin/chromium npx playwright test partial-export --project=chromium` passed all 6 cases (including the new case), 0 failures. See [focused log](provenance-results.txt) and [workbook screenshot](screenshots/workbook-source-exclusions.png). Typecheck and lint passed again after this test-only extension. Production source did not change after the completed review or 109-case full run; the final test set has 110 distinct passing Chromium cases across the full run and this focused extension.

No actionable review findings remain unapplied. The CE simplification fallback and its single behavior-preserving change are recorded in [simplification.md](simplification.md). Generated historical U9–U11 screenshots were restored; only U12 evidence is included. A draft PR is the delivery boundary for user UX acceptance; nothing was merged/deployed and U13 was not started.
