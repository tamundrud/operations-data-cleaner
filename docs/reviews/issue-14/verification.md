# Issue #14 implementation verification

Base: `feat/u13-release-qualification` at `93ec73403b26aeddb5044c80534d30cca871dc96`. Dedicated branch: `fix/issue-14-ux-acceptance`. The initial checkout was clean; no pre-existing local work is included. All data and screenshots use synthetic fixtures.

## Required behavior and evidence

| Issue requirement | Implementation | Regression evidence |
| --- | --- | --- |
| Exit workflow editing | Done editing returns saved/imported configurations to repeat mode; unsaved changes remain visible and are not saved implicitly | `acceptance-corrections.spec.ts`: repeated editing exits, exact download, reload of unchanged stored workflow |
| Actionable exception causes | Runtime cause identity and operand/rule targets; presentation projection links dependent required blanks without deleting raw diagnostics | `issue-review.test.ts`: four split outputs, eight diagnostics, one cause; both invalid operands; independent blanks/warnings; source versus policy targets |
| Source highlighting and navigation | Explicit issue actions open and focus the original source cell, or open relevant workflow settings; error/warning text accompanies highlighting | `acceptance-corrections.spec.ts`: Address, rule settings, Excel record 103 and worksheet provenance |
| Independent inspection filters | Full-dataset all/exception/invalid queries and source pagination preserve output selection; resolved records remain until explicit source navigation | Multi-page mixed dataset test, off-page Excel navigation, existing 10,000-row correction regressions |
| Staged atomic corrections | Session holds drafts separately; worker validates/evaluates candidate overlay before promotion; downloads blocked until apply/discard; reverts staged | Session failure/cancel/retry/stale-reply tests, invalid-coordinate real-worker regression, multi-page exact download, cancelled loss and failed replacement journeys |

Workflow schema version remains 1. Runtime cause metadata, pending edits, navigation state, customer rows and filenames are never serialized into workflow storage or backups. Existing decimal/date rules, raw issue counts, warning eligibility, source identity, and partial-export/formula gates remain binding.

## Verification strategy

The baseline passed 289 unit tests and 15 existing correction/partial-export/release browser tests. New cause, policy, batch and UI tests were observed failing before the corresponding behavior was implemented. Red and green outputs are retained in `validation/`. Existing browser tests were updated to use staged batch controls and independent source filters. The dates regression now asserts five actionable items alongside all nine raw diagnostics, rather than asserting the superseded duplicate presentation.

Final typecheck, lint, build and all 299 unit tests passed. The complete Chromium suite passed 119/119 tests (8.5 minutes). After the final review fixes, 17 focused correction, source-navigation, privacy and accessibility browser tests passed on the final build (1.1 minutes). `validation/`, `tested-source.json`, and `build-hashes.json` retain the commands/results and tested bytes. The full pass preceded two narrow review fixes; the final unit and focused browser runs verify those fixes, and PR CI runs the complete matrix on the submitted commit. Full suites include byte/type fidelity, privacy interception, accessibility, portability and 10,000-row coverage. No test threshold is relaxed to accommodate the environment.

Environment: managed Debian 13 Cloud workspace, Node 24.19.0, system Chromium 154.0.8037.57. Cloud observations are not reference-laptop qualification. Firefox/WebKit installation is blocked locally by the network policy (HTTP 403 Domain forbidden); `validation/local-browser-install-blocker.txt` retains the attempted install. The existing GitHub Actions Chromium/Firefox/WebKit matrix remains required for the draft PR.

## CE workflow

Installed filesystem `ce-work` and its references govern this run with native execution. The addendum plan and six-persona document-review receipt are under `plan-review/`. Three-persona simplification findings and their resolution are under `simplification/`. The dedicated code-review receipt and finding disposition are under `code-review/`. The completed full code-review receipt is `code-review/review.json`, run `20261021-005053-7f6a13f0`: ten reviewers completed, four source/test concerns were fixed, two unsupported claims were rejected, and no actionable or residual finding remains. The final checks above completed after that receipt. No independent cross-model review is claimed because another provider's CLI was unavailable.

## UX acceptance walkthrough

1. Import `examples/release/workflow.json`, upload `examples/release/needs-correction.csv`, and use Inspect Units on the numeric exception. Stage `12`; verify pending feedback and blocked download, then Apply 1 corrections and inspect the original value and recalculated results.
2. Enter Edit workflow, change a rule, and choose Done editing. Verify retained unsaved state and repeat-mode validation before deciding whether to save.
3. Use a multi-page source with exceptions: inspect all/exception/invalid filters, stage several cells on different source pages, return to those pages, then apply once or explicitly discard. Verify output pagination stays independent and resolved records remain available for confirmation.
4. Inspect the grouped Address failure and its affected outputs, follow the source action, then check rule-setting actions for failures without a source-cell fix.

The draft is left for the user's UX acceptance. No merge, deployment, publication, or release is authorized or performed.
