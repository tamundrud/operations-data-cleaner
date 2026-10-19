# U11 verification

Scope: Session source correction and safe reupload from the approved [master plan](../../plans/2026-10-11-1607-feat-operations-data-cleaner-plan.md), U11 only. Base: latest origin/main at start, 7e418ac06876c73643ced6ad552e0f8addec714b (U10). Dedicated branch: feat/u11-session-source-correction. Pre-work checkout and index were clean, with no commits beyond main.

The installed ce-work skill was loaded from $HOME/.agents/skills/ce-work/SKILL.md with its required phase references. Native implementation ran inline for the single dependent unit. Installed ce-simplify-code, ce-code-review, ce-commit-push-pr and ce-noslop instructions governed finishing. The approved U11 request supplies implementation authority; no plan body was changed.

## Results

Environment: Codex Cloud, Node 24.19.0, Chromium 154.0.8037.57 from /usr/bin/chromium, production Vite build served locally with the repository CSP.

| Command | Observed result |
| --- | --- |
| npm run typecheck | Passed |
| npm run lint | Passed |
| npm run test:unit | 284 passed, 22 files |
| npm run build | Passed |
| U2_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --project=chromium | 103 passed, zero flaky/skipped/unexpected, 5.0 minutes |
| U2_CHROMIUM_PATH=/usr/bin/chromium npx playwright test correction-reupload --project=chromium | 7 passed on the final production build, including added Excel integration |

The full run covers U1–U10 browser regressions, accessibility, actual CSV/Excel bytes, persistence/portability, suggestions, hostile input, privacy, performance and the first six U11 scenarios. The final focused run follows minor copy changes and adds a seventh U11 scenario using real XLSX input/output. Together these runs exercise 104 distinct browser cases. [Full results](browser-suite.txt), [full summary](browser-suite-summary.json), [final U11 results](correction-suite.txt), [final U11 summary](correction-suite-summary.json), [unit results](unit-suite.txt).

## U11 evidence

- Twenty Four → 24 repairs every dependent calculation; originals remain inspectable. Revert restores invalid status.
- Original cells, Excel raw/type/format details and row identity remain intact. Cleared cells retain candidate records. Missing trailing CSV cells support correction/revert.
- Incremental and full evaluation agree on values, statuses, CSV risks and counts; incomplete mappings retain full candidate counts.
- Corrections stay outside saved IndexedDB records and portable workflow JSON. Reload clears source data and edits.
- Confirmation cancellation, failed replacement, delayed-read cancellation, parsing-worker cancellation and retry preserve corrected data and provenance. Recovery blocks download until completion.
- Same-worker stale replies and production-worker stale correction requests cannot replace current results.
- Paginated and filtered-exception correction controls target the matching original records.
- Real Excel corrections preserve leading-zero identifiers and accept explicit YYYY-MM-DD replacements for Excel date rules; downloaded OOXML contains literal text and numeric calendar dates without formulas.

The privacy journey intercepts the entire browser context before load, blocks service workers, rejects non-static/data-bearing requests and WebSockets, and checks source/correction/file-name sentinels in diagnostics and persisted configuration. [Observed result](privacy.json): zero unexpected requests and zero diagnostic leaks.

The 10,000-row correction on a later preview page clears one source cell and verifies every exported byte plus full candidate identity. The full-suite correction-through-download measurement was 331.6 ms; [raw measurement](correction-timing.json). [Final focused measurement](correction-timing-final.json) is retained separately. These are cloud-runner observations, not reference-laptop qualification.

## Review and screenshots

[Three-lens simplification](simplification.md) applied four improvements. [Full CE review receipt](code-review/review.json) has status complete; nine lenses ran. Both confirmed P2 findings were reproduced by failing regression tests before caller-owned fixes, then verified passing. [Resolution evidence](review-follow-up.md) records all findings and closed test gaps. No actionable finding remains unapplied.

The initial test-first launch failed during dependency setup and did not establish a behavioral red baseline. After npm ci, unit and browser checks ran with the pinned project dependencies. The later review regressions supplied explicit failing-then-passing proof.

Captured and inspected:
- [Correction editor](screenshots/correction-editor.png)
- [Corrected desktop workspace](screenshots/corrected-desktop.png)
- [Replacement warning](screenshots/replacement-warning.png)
- [Corrected mobile workspace](screenshots/corrected-mobile.png)

## Limits and handoff

Playwright browser binaries were absent. Its download was denied by cloud network policy at cdn.playwright.dev. The installed Chromium provided executable browser verification; Firefox/WebKit were not run locally. No alternate-provider CLI was available for cross-model review; the installed CE local adversarial fallback completed instead.

The existing hostile-workbook test now paces synthetic XLSX download bursts to avoid the installed Chromium's eleventh-download throttle. Parsing budgets and all independent byte/type checks remain unchanged. The initial full run also exposed a source-table whitespace selector that included new button text; the final assertion still checks the exact source value.

U12 partial export remains unimplemented and invalid rows still block download. The PR is a draft for UX acceptance. No merge or deployment is authorized or performed.
