---
title: U2 row-aligned mapping revision
type: feat
origin: docs/PRD.md
execution: code
---

# U2 row-aligned mapping revision

> Historical implementation plan. Its row-form presentation is superseded by [the approved paired-card implementation plan](2026-10-14-u2-paired-card-matching.md). Preserve its automatic-preview safeguards.

## Approved scope

The user's 2026-10-13 implementation instruction supersedes KTD-09's dropdown-primary adjacent panels and the unapproved connecting-board proposal. Implement on existing draft PR #2, branch `feat/u2-csv-conversion`. Keep U2 acceptance pending hands-on approval; no U3, merge, publication or ready-for-review transition.

Source columns appear in a searchable, reusable source area with faithful display samples. Destination rows show their source mapping position beside their editable output header. Drag or select/click to map/replace; native labelled source selection is also available. No connector lines, graph nodes, large cards or DnD framework. Template/add/rename/remove/reorder remain direct. Validation remains secondary. Preview spans the width beneath the workspace.

Automatic preview is user-directed and consistent with PRD FR-27. No mandatory refresh button. Preserve independent recipe/schema, normalized header identity, provenance, counts, export byte safety and all supported-capability guards.

## Implementation unit

Files: `src/ui/Workspace.tsx`, `src/ui/MappingRows.tsx`, `src/ui/styles.css`, relevant `tests/e2e/` helpers/regressions/privacy/performance/accessibility, this addendum and new review/evidence documentation. Keep `src/engine/`, format adapters, worker protocol and session implementation unchanged unless a demonstrated blocker requires a narrow, independently verified correction.

1. Build compact source buttons and row-aligned source-select/output-name controls; use native drag events constrained to an app-held source key, never interpret outside drop data as a workflow. Source buttons remain reusable and searchable. Keep stable field IDs through rename/reorder; preserve source samples as text and spaces.
2. Keep native select for click/keyboard source choice; selected-source → labelled Match action and Escape cancel. Unlink removes recipe but preserves output. Movement/removal controls have field-specific accessible names. Validation is a per-row disclosure. Template replacement requires explicit confirmation before existing fields are discarded; cancel/failure preserves current fields.
3. At every field change increment a UI draft generation, invalidate export/safety choice immediately and debounce evaluation 250 ms. Submit through existing `Session.configure` only when idle. Track generation submitted for the pending run. A completed older result cannot clear dirty state; schedule the newest draft after that run completes. Hide outdated row results/headers together. Keep editing available during evaluation, but disable import/template/export/page mutations while their operation is in progress. Errors/recovery stop automatic retry loops; explicit retry may resume.
4. Preserve source inspection/provenance, existing counts/exception pagination/safety choices, cancel/retry, valid-only U2 export and source/session privacy. No guesses, intentional blanks, constants/trim, new recipes or persistence.
5. Fit 25 source/30 destination columns with a bounded source list and independently scrollable destination table. Alignment is contained within each destination row, so scrolling never separates a match from its output. Laptop widths retain two areas; narrow widths stack them with native controls and local table scrolling.

## Verification

Retain existing assertions about exact downloaded bytes/data, formula handling, counts, unmapped/invalid errors, failed replacements, cancel/retry and sample transaction. Change obsolete form/refresh selectors to the new UI, without weakening behavior assertions. Add browser tests for drag replacement/reuse, keyboard selection/focus, search, 25/30 row management, automatic debounce and in-flight latest-generation behavior, stale/incomplete download gating and template replacement/cancel. Extend request-interception privacy journey to new matching/search/unlink/reorder paths.

Run typecheck, lint, unit, build, production browser suites including privacy/accessibility and 10,000-row performance. Attempt all configured browser engines and record actual environment failures separately. Capture synthetic screenshots at desktop 1440px and laptop 1024/1366px, including 25/30 columns. Run mandatory CE simplification/code-review procedures, apply verified findings, rerun affected checks, and archive actual review receipts or incomplete steps. Update existing draft PR with results/limitations and keep hands-on UX approval pending.

## Preserved boundaries and confidence

The current workflow field IDs/ordered array, View source samples and Session.configure boundary support this UI without a second mapping model. Session rejects configure while busy, so UI scheduling queues a newer generation rather than relying on concurrent worker runs. Existing worker request/dataset/revision filtering remains authoritative. No library or architecture change is necessary. The user settled automatic refresh and row alignment; no product choice remains open before this scoped implementation.

Pre-existing untracked `.codex/` and `docs/design/u2/` are excluded from commits/publication. The old prototype remains a historical, unapproved artifact. The new implementation and screenshots supersede its design direction.
