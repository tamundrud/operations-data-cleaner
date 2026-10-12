---
title: Operations Data Cleaner - Plan
type: feat
date: 2026-10-11
artifact_contract: ce-unified-plan/v1
product_contract_source: legacy-requirements
origin: docs/PRD.md
execution: code
---

# Operations Data Cleaner - Plan

## Goal Capsule

Deliver the browser-only MVP specified in [PRD v0.2](../PRD.md). Begin with a bounded Excel feasibility gate before substantial application work, then demonstrate CSV conversion, constants, saved workflow reuse and logistics-aware suggestions before advanced transformations and Excel integration. Architecture, stack, product scope and safeguards are approved in principle; this revision does not authorize implementation or publication.

The repository currently contains documentation, fixtures directories, and repository policies, but no application stack. Preserve the existing Apache-2.0 license, synthetic-data-only policy, byte-preserving CSV attributes, and focused-branch/PR practices in [AGENTS.md](../../AGENTS.md).

---

## Product Contract

### Summary and problem frame

Help an ordinary spreadsheet user repeatedly convert customer order exports into a user-defined TMS import table without transmitting customer data. Success means reliable files and understandable exceptions, not vendor-certified interoperability, traffic, or commercial traction.

### Binding requirements

The PRD owns product behavior and acceptance examples. The following IDs organize delivery; they do not replace or weaken the referenced requirements.

| Plan ID | Binding PRD requirements | Delivery concern |
| --- | --- | --- |
| R1 | FR-01–06, FR-35–37 | CSV/XLSX input, destination definition, row and cell fidelity |
| R2 | FR-07–10, FR-38–39 | Graphical independent recipes, confirmed suggestions, compatible headers |
| R3 | FR-12–17, FR-40–41, FR-43 | Constants, trim, split/combine, arithmetic, dates |
| R4 | FR-19–25, FR-44 | Full-dataset validation, corrections, acknowledged exclusions |
| R5 | FR-29–34, FR-46 | Ad hoc use, versioned local workflows, portable backup, synthetic examples |
| R6 | FR-27–28, FR-45, FR-47 | Preview, output bytes/types, explicit spreadsheet safety |
| R7 | NFR-01–06 | Local processing, ephemeral source data, hostile-content protection |
| R8 | NFR-07–10 | Responsiveness, 10,000-row qualification, round trips and counts |
| R9 | NFR-11–14 | Desktop-first, accessible visual controls and actionable messages |
| R10 | NFR-15–16; PRD §11 | Same hosted/local app, documentation and public demonstration |

PRD §14.1 remains binding: one candidate per original nonblank row, independent output recipes, source-only session edits, normalized-header matching, no inferred conversions, no silent rounding/cleanup, and explicit safe-versus-raw CSV handling. Preserve the browser-only and visual-first boundaries throughout.

### Scope and optional capabilities

Implement every MUST requirement and AC-01–22. Defer FR-11 suggestion explanations, FR-26 downloadable exception reports, and FR-42 exact-match replacements/AC-23 to a follow-on release. On-screen exception counts and excluded-row references remain mandatory. Do not create extension machinery for these deferred features.

No backend, accounts, cloud storage, AI, telemetry, arbitrary expressions, plugins, joins, aggregation, row expansion, destination overrides, locale guessing, or proprietary TMS certification. Mobile editing is not a release requirement. Early slices are internal demonstrations, not the complete MVP.

---

## Planning Contract

### KTD-01 — Small static application and dependency policy

Use React with strict TypeScript, Vite, and ordinary CSS. A single workspace and local navigation state are enough: no router, state-management package, UI framework, server runtime, or service worker. Use native labelled controls and paginated tables rather than a spreadsheet-grid dependency.

Use npm with a committed lockfile and a supported Node LTS development environment; record the exact versions in U2. Add dependencies only when their unit needs them:

| Dependency | Purpose and rationale | Qualification |
| --- | --- | --- |
| Papa Parse | CSV quoting/delimiter handling; keep records as arrays | Disable automatic typing, header-object conversion, and implicit blank-row skipping. [Official documentation](https://www.papaparse.com/docs) notes automatic duplicate-header renaming in header mode; that behavior must not hide invalid headers. |
| Zod | Runtime validation of finite, versioned workflow JSON; inferred TypeScript types | Strict objects/discriminated variants; separate semantic checks. [Official documentation](https://zod.dev/) |
| big.js | Decimal operations from strings | Addition/multiplication are exact; division needs the explicit policy in KTD-04, not a global precision guess. [Official repository](https://github.com/MikeMcl/big.js/) |
| SheetJS Community Edition | XLSX metadata-aware reader and value-only writer | Pin the official distribution, verify integrity and applicable advisories before adoption. Official installation documentation currently identifies 0.20.3 while the public npm `xlsx` package is outdated; do not install that stale package by default. Bundle locally, never load a runtime CDN. [Official installation guidance](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) |
| fflate, conditional on U1 | Candidate for bounded ZIP handling if the selected XLSX reader lacks adequate protections | Qualify only if needed; do not add it to the application by default. [Official repository](https://github.com/101arrowz/fflate) documents streaming ZIP support, not proof that a custom preflight/reconstruction layer is necessary or sufficient. |
| Vitest and Playwright | Pure engine/format tests and real browser/download/privacy tests | Test the production build; no snapshots-only acceptance. |

Check licenses, provenance, security advisories, and browser/build compatibility at introduction. Pin approved versions; a lockfile alone does not qualify a vulnerable dependency. Keep third-party notices. No dependencies have been installed or experimentally qualified during this planning turn.

### High-level technical design

The sketches below and the recipe/model tables are directional contracts, not prescribed component names or implementation code. They cover component ownership, worker protocol, session states/lifecycle, data flow, export decisions, option combinations and the finite recipe grammar. The KTDs own their detailed rules.

Worker protocol (KTD-02/05):

```mermaid
sequenceDiagram
  participant UI as Workspace
  participant C as Session controller
  participant W as Processing worker
  UI->>C: File and workflow configuration
  C->>W: Import/evaluate with dataset and revision
  W-->>C: Full counts, issues and requested preview page
  C-->>UI: Current revision ready for review
  UI->>C: Export choice and acknowledgement
  C->>W: Serialize eligible current revision
  W-->>UI: Download bytes
```

Session states (KTD-05; successful replacement commits a new dataset, failure keeps the old one):

```mermaid
stateDiagram-v2
  [*] --> Empty
  Empty --> Importing: upload
  Importing --> Draft: compatible table
  Importing --> Empty: failure with no prior run
  Draft --> Processing: valid configuration
  Processing --> Review: current result
  Review --> Processing: correction or rule change
  Processing --> Draft: workflow error
  Review --> Importing: replacement candidate
  Importing --> Review: replacement failed; prior run retained
  Review --> Empty: end session
```

Value data flow (KTD-03/04):

```mermaid
flowchart LR
  Original[Immutable source cells] --> Effective[Apply memory-only correction overlay]
  Effective --> Recipe[Independent primary recipe]
  Recipe --> Modifier[Explicit trim/date/precision settings]
  Modifier --> Validate[Field validation and provenance]
  Validate --> Result[Candidate row values and issues]
```

Export option combinations (KTD-05–07):

| Format | Invalid rows | Formula-like text | Eligibility |
| --- | --- | --- | --- |
| CSV | None | None | Complete export |
| CSV | None or some | Present | Current safe/raw choice required; partial acknowledgement also required if invalid rows exist |
| CSV/XLSX | Some | Any | All eligible rows only after current exact-exclusion acknowledgement |
| XLSX | None | Present | Complete export with literal string cells |
| Either | Workflow error, pending result, or no eligible rows | Any | Blocked |

### KTD-02 — Engine boundary, worker and file layout

```mermaid
flowchart LR
  UI[React workspace] --> Session[Session controller]
  Session --> Worker[One app-owned module worker]
  Worker --> Formats[CSV / XLSX adapters]
  Worker --> Engine[Pure transformation and validation engine]
  UI --> Store[Workflow-only IndexedDB adapter]
  UI --> Suggestions[Deterministic header suggestions]
  Worker --> Download[Export bytes via Blob download]
```

`src/engine/` accepts workflow configuration, parsed source data and correction overlays, and returns candidate records/issues. It has no React, DOM, storage, network, or workbook-library dependency. Format adapters translate cells and bytes at its boundary. The worker owns source cells and computed results; the UI receives summaries and requested pages, not a second full table for rendering.

Use a small tagged message protocol for import, run, correct, page, export and cancel. Every request/result carries dataset identity and revision. No generic RPC framework. Terminate/recreate a worker for cancellation of a synchronous parser; never export an incomplete run. The session controller retains the active File handle, import settings, dataset identity, working workflow and correction overlay in memory, but not a second parsed table. After worker termination/crash, reparse that active File and replay the overlay before restoring review/export. A candidate replacement has separate recovery state and cannot replace the active File or clear corrections until successfully committed; invalidate old export acknowledgements during recovery.

Resource lifecycle:

| Resource | Creation/use | Replacement/recovery | Session end |
| --- | --- | --- | --- |
| Active File and correction overlay | Controller memory; worker evaluates effective cells | Retained until replacement commits; replay after worker restart | Released; never persisted |
| Parsed cells and candidate results | Worker memory for current dataset/revision | Rebuilt after cancellation/crash; superseded replies discarded | Worker terminated and memory released |
| Named workflow configuration | Draft in memory; IndexedDB only on explicit save | Versioned codec; failed save leaves draft intact | Only explicitly saved configuration survives |

Proposed layout, created only during implementation:

```text
src/
  engine/       workflow, values, recipes, validation, issues
  formats/      csv, xlsx, spreadsheet-safety; archive-budget only if U1 justifies it
  session/      controller, worker-protocol, correction-overlay
  workflows/    codec, indexeddb-store
  suggestions/  dictionary, matches
  ui/           workspace, recipe-editor, review, saved-workflows
  processing.worker.ts
tests/
  unit/         domain and adapter contracts
  e2e/          user journeys, downloads, privacy, performance
  fixtures/     synthetic inputs and expected bytes/workflows
docs/decisions/ documented material choices during implementation
```

### KTD-03 — Core models and declarative workflow version 1

Define the complete finite MVP grammar in U2. A build supports only its delivered recipe variants; imported configurations needing a later capability fail clearly rather than execute partially. Do not build a plugin registry or migration framework. Version 1 is the first supported version; future/unknown versions are rejected. Any later supported migration must be explicit and golden-tested.

| Model | Required contents and invariants |
| --- | --- |
| Workflow | Format version; configuration identity and optional draft name (name required on Save); source format settings and referenced normalized headers; ordered destination fields; CSV/XLSX output settings. Only configuration, never source filenames/rows, sample values, session revisions or row IDs. |
| Destination field | Stable internal ID, output header, expected text/number/date type (default text), required flag (default optional), optional maximum text length/whole-number/scale rules; one primary recipe; explicit trim/date modifier and rounding settings when applicable. Unfinished mappings are draft state, not exportable workflows. |
| Source column | Position, literal display header, normalized matching key. Normalization is boundary trim, internal-whitespace collapse and deterministic case-folding; blank/duplicate keys block. Preserve literal header separately. |
| Source cell | Raw kind/value, original display text, workbook format/date-system information when applicable; formula presence and cached-result provenance. CSV starts as text, not auto-inferred numbers/dates. |
| Source row | Stable identity tied to dataset and original record position; immutable original cells; CSV logical record and physical starting line, or worksheet name and original Excel row. Embedded newlines do not break row references. |
| Typed result value | Blank, text, exact decimal string, or calendar date with year/month/day. Errors are issues, never `NaN`, guessed dates or sentinel strings in export. |
| Correction overlay | Source row ID/column key to explicit replacement value; originals stay inspectable. Memory only; no changes to the uploaded file. |
| Field result/provenance | Destination field ID, typed value, referenced source cells/constants, applied modifiers and use of corrected/cached input. No output-to-output dependencies. |
| Issue | Stable code, workflow/row scope, error/warning severity, row/field/source references, plain-language reason and next action. Row status derives from issues. |
| Run summary | Input data rows, skipped original blank rows, candidate rows, valid/warning-only/invalid row counts, issue counts, distinct corrected rows and exclusions. Counts cover the complete dataset. |
| Export request | Current run revision, format/options, CSV risk choice, and partial-export acknowledgement when needed. Reject stale or unfinished requests. |

Finite recipe grammar:

| Primary tag | Configuration |
| --- | --- |
| Copy | One source column key |
| Constant | Typed text, exact decimal literal, or intentional blank |
| Split | One source column; literal delimiter; expected segment count; selected segment index; explicit segment trimming and optional-empty positions |
| Combine | Ordered list of at least two source/literal components; literal separator; retain empty components (no hidden suppression) |
| Calculate | One of add/subtract/multiply/divide; two operands, each source reference or exact decimal constant |

Output modifiers are limited to explicit text trim and explicit source-to-target date format conversion. Validation/number precision are field settings, not general operation chains. Reject incompatible combinations, missing references, duplicate field IDs and malformed variants before a run. Strict JSON decoding must reject unexpected properties instead of stripping executable-looking content and continuing. Impose bounded JSON size/depth/field counts; never evaluate strings, HTML or code.

Interfaces are data contracts, not framework abstractions: import returns source metadata/rows or an actionable failure; workflow validation returns blocking configuration issues; row evaluation returns field values/provenance/issues; dataset evaluation returns full counts and results; serialization accepts only a current eligible run. The storage adapter reads/writes validated workflow configuration only.

### KTD-04 — Deterministic value interpretation

Evaluate primary recipe, explicitly configured output trim/date interpretation, numeric precision policy, then validation. Validate whole-number requirements on the exact arithmetic result before rounding so fractional cases cannot be disguised. A blank optional copied/constant value does not fail merely for absence; missing arithmetic operands, failed splits and unusable referenced formula caches remain errors even for optional outputs.

Numeric conversion uses a documented strict decimal grammar: sign, decimal digits and optional decimal point; no guessed currency, thousands separators, units or locale. Keep operands/results as decimal strings. Use big.js for arithmetic, with a narrow integer-rational check for division: reduce the ratio and determine whether the denominator has only factors 2 and 5. Exact terminating division uses its required scale; nonterminating division without an explicit rounding rule is invalid. Precision excess likewise fails unless explicitly configured. Offer “Round half up,” “Round half to even,” and “Truncate toward zero,” each with decimal places and a visible example. Never let a library default decide business rounding. Defend against pathological digit/exponent sizes with documented resource limits.

Date parsing supports the three required patterns using strict calendar validation and a plain calendar-date representation, not `Date.parse` or timezone conversion. Excel input honors the 1900/1904 epoch; reject impossible serial dates including the fictitious 1900-02-29. Do not silently discard a time component when interpreting a cell as a date-only value; explain unsupported datetime input. Preserve raw/display values for inspection.

Text copy preserves content unless an explicit rule changes it. Excel numeric-to-text copying uses safely supported display formats (including all-zero padding such as `000000`); unsupported identifier formats and suspicious precision get warnings. Arithmetic uses raw numeric value, not currency-formatted display text. Warn that digits already lost in Excel cannot be recovered.

### KTD-05 — Session state, counts and export eligibility

```mermaid
flowchart TD
  File[Candidate upload] --> Parse[Parse and schema-check]
  Parse -->|failure| Keep[Show failure; retain prior active run]
  Parse -->|success and replacement approved| Active[Commit active dataset]
  Active --> Draft[Configure or reuse workflow]
  Draft --> Run[Evaluate full dataset at revision N]
  Run --> Review[Review counts and paginated results]
  Review -->|rule or source edit| Next[Invalidate export and acknowledgements; revision N+1]
  Next --> Run
  Review -->|workflow error or pending run| Block[Export blocked]
  Review -->|no invalid rows| Complete[Complete export; visible warnings]
  Review -->|invalid rows| Partial[Exact excluded count and row references; explicit acknowledgement]
  Partial --> Export[Export all valid and warning-only rows]
```

Parse a replacement before committing it; ask before discarding active corrections and preserve rules. Failed replacements leave the prior dataset intact. Recompute the affected whole row after a source edit; recompute the dataset after a rule change. Discard worker replies for older revisions. Export and preview must refer to the same finalized revision/options. CSV safety and partial-export acknowledgements are tied to that revision, not treated as permanent permission saved in a workflow.

Candidate rows equal original nonblank source rows. Candidate count equals valid + warning-only + invalid; skipped blanks are separate. Preserve an original candidate row even if a correction clears all its cells. Report warning-row counts separately from warning-issue counts. Count distinct currently corrected rows, not keystrokes. A zero-eligible-row partial export is blocked with a useful action rather than producing a misleading empty file.

### KTD-06 — CSV contract and spreadsheet safety

Decode UTF-8 strictly (including optional BOM); fail on malformed bytes. Parse arrays without type inference or automatic blank skipping; inspect the first nonblank record as headers. Distinguish parser end-of-file artifacts from actual blank records in fixtures. Block malformed quoting and unexpected extra cells rather than silently truncate; preserve short rows as missing cells so validation can identify missing data. Verify detected comma/semicolon/tab delimiter or let the user select it. Template imports inspect names/order only.

Serialize the PRD default UTF-8/no-BOM/comma/header/CRLF and standard quoting; U3 adds the required settings. Raw mode preserves logical text exactly, including leading zeros and whitespace; normal CSV escaping is still required and is not preservation of the entire original source file.

Scan output text cells and headers for formula-like prefixes, including `=`, `+`, `-`, `@`, tabs, carriage returns and leading-whitespace/control variants. Typed negative numbers are not unsafe text. If risk exists, show affected fields/rows and require a choice: prefix risky text with an apostrophe for escaped output, or preserve raw text with an explicit warning against opening it in spreadsheets. Show the changed export representation before download. Do not promise that one CSV escape policy protects every spreadsheet/importer; raw TMS fidelity and spreadsheet interpretation are distinct. Apply this policy to constants/combined text/header labels as well as copied values. Excel output uses literal string cells instead.

### KTD-07 — XLSX qualification and resource safety

**U1 mechanism resolution:** [Excel qualification decision](../decisions/excel-fidelity.md) selects SheetJS CE 0.20.3 with native streaming bounded ZIP preflight. Preflight is required; archive reconstruction and a production fflate dependency are not needed for the qualified profile. U9/U10 must repeat this qualification in the integrated worker.

Use original cell type/value/display/format/formula metadata, not a flattening conversion that loses provenance. Never execute formulas; usable cached results carry stale-cache warnings to dependent output, while missing/unusable referenced caches produce row errors. Do not render imported HTML, activate hyperlinks, or fetch external workbook relationships.

Read only one user-selected worksheet and an ordinary first-nonblank-header table. Reject unsupported/encrypted formats and malformed archives clearly. U1 must establish an adequately safe resource-protection approach before substantial application work. First qualify the reader's existing controls and the smallest browser-side guard; add bounded ZIP preflight only if evidence identifies an uncovered risk, and archive reconstruction only if evidence shows it is needed beyond that preflight. Declared uncompressed sizes alone are not evidence against a ZIP bomb. A worker provides responsiveness, not a secure memory sandbox. Qualify actual expansion/allocation behavior, forged lengths, corrupt archives, duplicate/path-conflicting entries, cancellation and malicious worksheet dimensions. The selected approach must reject unsafe inputs without silently truncating meaningful data. If no bounded, maintainable approach meets the PRD, stop at U1 and escalate the blocker rather than defer Excel or weaken safeguards. U9/U10 repeat qualification in the integrated application before enabling XLSX.

Initial engineering guards: 25 MiB source files, 100 MiB actual expanded workbook data, 2 million inspected table cells, bounded JSON and decimal sizes, and a cancellable processing watchdog. These are provisional resource budgets, not a 10,000-row cap. Measure representative 10,000-row fixtures and adjust budgets with documented evidence before release; show exact limit/remediation rather than silently omit data.

Write a new value-only workbook with selected columns/types. Never copy source formulas, hyperlinks, rich HTML, macros or external relationships. Text is a string cell even when formula-like. Numeric output must round-trip to the intended decimal value under the workbook numeric representation; values that cannot be represented faithfully become export errors, with CSV/text-type alternatives explained rather than silently coerced. Date output uses a deliberate workbook epoch and date number format without timezone conversion. Preserve blanks and output column order.

### KTD-08 — Workflow-only persistence and portability

Use native IndexedDB behind one adapter; do not introduce a database framework for a small configuration collection. Explicit Save commits validated configuration. Rule edits remain a working draft until saved. Read failures, quota exhaustion, blocked storage and corrupt records get actionable messages; ad hoc processing and portable download must remain usable when storage fails.

Portable JSON and stored workflows use the same versioned codec. Import validates before altering anything. Name/identity collisions require explicit replace or save-copy choice, never an automatic overwrite. First successful save shows a nonblocking backup prompt; Download workflow remains visible. Warn that browser storage is clearable/browser-specific and constants/field names can be sensitive. Do not persist recent file names, datasets, corrections or preview samples anywhere, including localStorage, IndexedDB and service-worker caches.

### KTD-09 — Visual workspace and suggestions

Workspace areas: source table, ordered destination field cards, and output/review panel. Each card shows header, type, required flag, recipe summary and Edit. Copy mapping is a dropdown; transformations open small labelled forms with concrete examples, not a node graph or expression editor. Use Move up/down, remove and rename controls. Advanced validation/precision is revealed as needed. Confirmed/suggested/unmapped states have text labels, not color alone.

Keep preview to paginated pages (initially 50 rows), with full counts always visible and filters/navigation for every exception. Basic keyboard navigation, focus/error announcements and laptop layouts are part of every unit, not late polish. Daily operators see saved-workflow upload/review/export first; opening the editor is optional.

After U2's first working visual interface, review the complete upload → map → preview → export journey before accepting the slice or proceeding to U3. Use synthetic files and an operator with basic spreadsheet skills; ask them to map, rename/reorder, inspect output and download without mandatory onboarding, code or an explanatory walkthrough. Check obvious next actions, source-versus-output distinction, unmapped/error states, visible export settings/safety choice and keyboard operation. Record observed friction and agreed corrections; fix material discoverability/accessibility blockers and rerun the journey. A passing automated download test alone does not close this UX checkpoint. Request user review when a suitable operator is unavailable rather than inventing usability evidence.

Suggestions are a separate deterministic header-only function: exact normalized matches plus a small curated dictionary, with human confirmation. Initial positive pairs include `Ship To`/`Consignee` and `PO #`/`Purchase Order Reference`; ambiguous duplicates remain alternatives. Negative fixtures distinguish billing party from consignee, purchase order from sales order, shipment ID from stop ID, and quantities with different units. Do not use fuzzy substitution on repeat runs, inspect row data for suggestions, or auto-confirm. Reasons are deferred under FR-11.

### KTD-10 — Privacy, performance and operational constraints

Ship only bundled same-origin assets; no remote fonts, runtime CDN imports, telemetry, crash reporters or background services. Production CSP blocks network connections and active content: self-only scripts/workers/styles, `connect-src 'none'`, `object-src 'none'`, `base-uri 'none'`, and `form-action 'none'`; permit local Blob downloads and images only as needed. Prefer host response headers and also test the actual deployed policy. Dev tooling traffic is not the production privacy acceptance environment.

No source values/filenames/record IDs in URLs, console logs, error reports or diagnostic requests. Render untrusted strings as text. Local sample assets use fixed paths and synthetic content. A static host's ordinary request metadata is separate from source-data processing and must be described honestly.

Proposed acceptance environment: current stable desktop Chromium on a documented four-core-or-better, 8 GiB laptop; record actual OS, CPU, browser and production build hash. Also run functional/browser checks in Firefox and WebKit. Engineering targets: under-500-row CSV import-through-ready-preview within 1 second; 10,000 rows × 20 representative columns, full CSV import/process/export within 5 seconds and XLSX within 15 seconds; single-row correction within 200 ms; busy-state controls respond within 100 ms. Measure median and worst of five warm runs plus one cold run. These are proposed budgets, not measured claims. CI runs correctness/responsiveness smoke checks; reference-device timing is recorded before release. Keep the UI interactive, show stage/busy status and cancellation, and never apply a row cap to make a benchmark pass.

### Risks, dependencies and approval boundaries

| Risk/dependency | Response and stop condition |
| --- | --- |
| Excel fidelity, compressed archives and cached formulas | U1 gates substantial implementation; U9/U10 repeat integrated qualification. Choose the simplest approach with evidence; no claim that worker isolation or a library name proves safety. Inability to meet MUST behavior is a blocker requiring resolution, not deferral of Excel. |
| CSV raw fidelity conflicts with spreadsheet opening | KTD-06 preserves the settled explicit-choice decision; test changed/raw bytes and warning visibility. |
| Decimal/date interpretation can silently change meaning | KTD-04 finite explicit formats and error cases; no generic locale parser or floating-point shortcut. |
| Browser storage is unreliable/clearable | KTD-08 independent portable backup, localized failures, no source persistence. |
| First vertical slice requires foundational contracts | U2 keeps the foundation attached to a runnable conversion, not a standalone platform project. |
| Resource/timing proposals need measurements | User approves these engineering targets with the plan; revise using recorded evidence if ordinary 10,000-row use is excluded. |
| Hosting target and domain not selected | Build portable static assets and document CSP headers. Choose deployment destination and obtain publication approval at U13; not a blocker for U2. |

The stack, scope and safeguards are approved in principle; the revised sequence advances recurring-use value. Performance/resource targets remain provisional pending U1 and integrated measurements. U1 is ready as the first execution target when separately authorized; its pass is required before U2. No unresolved product decision requires reopening discovery. Material feasibility blockers, missing MUST behavior, relaxed fidelity/privacy protections or a library/architecture change require user approval. Completing this revision does not start ce-work.

---

## Implementation Units

### Unit index

Unit numbers are deliberately reassigned in this revision at the user's request; use the current numbers below. U1 is a limited qualification task, not an application feature slice. U2 is the first working vertical slice and includes the day-one synthetic source/template/workflow requirements.

| Unit | Demonstrable outcome | Primary paths | Dependencies |
| --- | --- | --- | --- |
| U1 | Early XLSX feasibility decision with qualification evidence | `tests/qualification/xlsx/`, `docs/decisions/excel-fidelity.md` | None |
| U2 | Reliable CSV mapping and download; early UX checkpoint | `src/engine/`, `src/formats/csv.ts`, `src/ui/workspace.tsx` | U1 |
| U3 | Fixed fields, trim and CSV options | `src/engine/recipes.ts`, `src/ui/recipe-editor.tsx` | U2 |
| U4 | Save, reopen and portable workflows | `src/workflows/`, `src/ui/saved-workflows.tsx` | U3 |
| U5 | Confirmable logistics suggestions | `src/suggestions/`, recipe editor | U4 |
| U6 | Strict split and ordered combine | Same recipe/editor boundaries | U5 |
| U7 | Exact arithmetic and numeric rules | `src/engine/decimal.ts`, `src/engine/validation.ts` | U6 |
| U8 | Explicit dates | `src/engine/dates.ts` | U7 |
| U9 | One-sheet Excel-to-CSV | `src/formats/xlsx.ts`; resource adapter only if justified by U1 | U1 and U8 |
| U10 | Typed Excel downloads | `src/formats/xlsx.ts` | U9 |
| U11 | Source correction and safe replacement | `src/session/correction-overlay.ts`, `src/ui/review.tsx` | U10 |
| U12 | Acknowledged partial export | `src/session/controller.ts`, `src/ui/review.tsx` | U11 |
| U13 | Qualified public-release candidate | `README.md`, `docs/`, integrated browser tests | U12 |

### U1. Early Excel feasibility gate

**Goal:** Before substantial application implementation, establish whether the proposed XLSX dependencies and browser-only approach can satisfy the PRD with a maintainable, proportionate adapter. This qualification is planned here, not performed during this documentation revision.

**Requirements:** R1/R6/R7/R8; FR-01–02,06,36,41,45,47; AC-08–09 and17 XLSX feasibility; NFR-01,05–08. Qualification evidence does not replace final acceptance in U9/U10/U13.

**Dependencies:** None. **Files:** During separately authorized execution only: a minimal isolated browser-worker qualification harness under `tests/qualification/xlsx/`, synthetic fidelity/hostile workbook fixtures, and `docs/decisions/excel-fidelity.md`. Keep the harness independent of the production UI, engine and workflow store; do not scaffold the complete app or build a generic archive framework.

**Approach:** Inspect current official distribution, API/source behavior, licenses and advisories; pin exact candidate versions for reproducible probes. Start with SheetJS and existing resource controls. Evaluate fflate or a custom guard only for a demonstrated gap. Test reading raw type/value/display/format/date-system/formula-cache metadata and writing a fresh literal-only workbook. Compare the direct reader, smallest guard and (only if needed) bounded preflight/reconstruction against the same fixtures. An increased file-size limit or worker timeout alone is not proof of bounded expansion or allocation safety. Do not send fixture contents to services.

**Test scenarios:** (1) Text `001234`, numeric `1234` with `000000`, long numeric identifiers and unsupported formatting retain metadata needed for preservation/warnings. (2) Both Excel date epochs, leap boundaries, date-only versus time-bearing cells, and impossible serials support KTD-04's explicit handling without timezone shifts. (3) Cached/missing formula results remain distinguishable, formulas/links are not executed/fetched, and formula-like output text has literal string type with no formula property. (4) Malformed/encrypted archives, forged expansion sizes, duplicate/conflicting members, extreme compression and inflated worksheet dimensions exercise rejection, actual resource bounds and cancellation without truncation or transmission. (5) A representative 10,000-row workbook completes with measured resource/timing observations; the provisional budget must not exclude ordinary intended files.

**Verification/exit gate:** Record exact versions, source/API observations, reproducible probe commands, per-fixture results, independently inspected output XML, browser request interception, resource observations and limitations. Pass only with evidence for all four areas—cell fidelity, dates, formula safety and resource protection—and a specific simplest supported approach. State explicitly whether ZIP preflight and archive reconstruction are each needed and why; update KTD-07 and U9's conditional adapter path accordingly. If a requirement remains unsupported or unbounded, mark the gate blocked, name the failing requirement/evidence and obtain user direction before substantial implementation. A proposed alternative library must be reviewed, not silently substituted. This is a feasibility pass, not a release claim.

### U2. Reliable minimal CSV-to-CSV conversion

**Goal:** Upload a CSV and destination header template or manual field list, map/rename/reorder fields, review and download correct CSV without saving anything. Try sample data runs a bundled synthetic workflow from day one.

**Requirements:** R1/R2/R4–R10 baseline; FR-01,03–07,17,19–22,27,29,34–39,44–47; AC-01,08 CSV,11,16 defaults,17 CSV,20–22 baseline. Subsequent units complete the remaining variants, not weaken them.

**Dependencies:** U1. **Files:** npm/TypeScript/Vite/Vitest/Playwright configuration; `src/engine/{workflow,values,recipes,validation,issues}.ts`; `src/formats/{csv,spreadsheet-safety}.ts`; worker/session/workspace files; `tests/unit/{workflow,csv,copy,counts,safety}.test.ts`; `tests/e2e/{conversion,privacy,performance}.spec.ts`; synthetic source/template/workflow/byte fixtures; `docs/decisions/browser-processing.md`.

**Approach:** Establish KTD-01–06/09–10 contracts together with the working path. Define all finite schema variants, activate copy only. Support required text/max-length validation and explicit text defaults. Every included output field needs a confirmed recipe; unfinished fields block export, not become implicit blanks. Workflow-level errors block runs; invalid rows block export until U12. Ship restrictive production CSP and request interception now, not after release.

**Test scenarios:** (1) Map `001234`, rename/reorder and quote commas/newlines/quotes: exact selected bytes/default CRLF. (2) Ten nonblank plus two blank rows and a totals row: exact candidate/blank counts, no silent discard. (3) Duplicate/empty headers, invalid UTF-8/quotes and extra cells: actionable failure; missing required copied value: row invalid. (4) Formula-like header/text: export blocked pending safe/raw choice; raw retains text, escaped representation is visible. (5) Synthetic sample succeeds without user files; source contents never occur in requests or browser storage. (6) 10,000 rows remain intact, worker busy/cancel behavior is observable, keyboard mapping works.

**Verification:** Download byte comparisons and full-dataset counts, pure tests, production browser privacy test and documented initial performance measurement. CI performs real type/build/unit/browser/privacy checks, not placeholder success jobs. Close the early UX checkpoint in KTD-09 with observed operator/user review and retested material corrections before accepting U2 or advancing to U3.

### U3. Constants, explicit trim and CSV export settings

**Goal:** Produce target-ready fixed fields and intentionally blank columns with selectable CSV settings.

**Requirements:** R3/R6; FR-12,40,45; AC-07,16 options. **Dependencies:** U2. **Files:** recipe/validation/editor and CSV adapter; `tests/unit/{constants,trim,csv-options}.test.ts`; `tests/e2e/constants.spec.ts`; updated example workflow.

**Approach:** Implement KTD-03/04/06 typed constant and explicit-trim variants. Add comma/semicolon/tab, BOM and header controls; carry settings in configuration. No automatic trim.

**Test scenarios:** Text `0012`, number `12.50`, intentional blank preserve chosen semantics; blank optional succeeds while blank required fails. Whitespace changes only with enabled trim. Every delimiter/BOM/header combination matches exact golden bytes. Formula-like constants require safety choice.

**Verification:** Ad hoc source→fixed/trimmed output browser download and unit golden tests, with privacy regression.

### U4. Save, repeat and portable backup

**Goal:** Save a named workflow, reopen it with new data, or transfer its configuration to another browser/local instance.

**Requirements:** R2/R5; FR-04 existing definition,10,29–33,39,46; AC-12,18–19. **Dependencies:** U3. **Files:** `src/workflows/{codec,indexeddb-store}.ts`, saved-workflow UI; `tests/unit/workflow-roundtrip.test.ts`; `tests/e2e/{persistence,workflow-portability}.spec.ts`.

**Approach:** KTD-03/08; same codec for JSON and IndexedDB, explicit save, visible backup prompt/action. Demonstrate reuse now with copy/constants/trim and CSV settings; no dependency on advanced recipes or Excel. Unsupported not-yet-delivered capabilities fail clearly under KTD-03. No migration for a nonexistent prior version. Each later recipe/format unit extends saved-workflow and portable round-trip fixtures alongside its own behavior.

**Test scenarios:** Save a copy/constant CSV workflow, reopen it, upload a compatible new file and export without remapping or reopening the editor. Reordered/extra columns succeed; missing/duplicate normalized or merely similar renamed headers block without remapping. Delivered rules/export settings survive hosted/local and separate browser-context round trips; a workflow requiring an undelivered recipe/format is rejected without reinterpretation. Future versions, malformed JSON, excessive nesting and unsafe unknown properties fail before store changes. Quota/blocked storage/corrupt records do not lose the active draft or block portable download. Upload sentinel values/file names never appear in storage or workflow JSON; U11 adds correction-overlay exclusion checks.

**Verification:** Golden workflow meaning and download JSON checks, forced storage failures, repeat-run browser/privacy tests; saved configuration alone can define a destination.

### U5. Deterministic, confirmable logistics suggestions

**Goal:** Help first-time users map high-confidence header equivalents without making product decisions for them.

**Requirements:** R2/R9; FR-08–09; AC-02. **Dependencies:** U4. **Files:** `src/suggestions/{dictionary,matches}.ts`, recipe editor; `tests/unit/suggestions.test.ts`; `tests/e2e/suggestions.spec.ts`.

**Approach:** KTD-09 header-only candidates, explicit accept/reject/change; existing confirmed recipes remain authoritative. No AI, generic fuzzy engine or sample-data inference.

**Test scenarios:** Ship To suggests Consignee; PO # suggests Purchase Order Reference. Suggested stays unconfirmed until action; reject/remove remains possible. Negative/ambiguous logistics pairs never silently map. Save/download/reimport an accepted mapping and reuse it without reconfirming; rejected/unconfirmed candidates are not persisted as approved recipes. Saved compatible mappings run directly; unknown renamed source headers still block.

**Verification:** Dictionary positive/negative tests and keyboard first-time/returning user journeys; no additional network requests or transmitted headers.

### U6. Strict split and ordered combination

**Goal:** Split a logistics address into independent target fields and combine configured fields/literals visually.

**Requirements:** R3; FR-13–14,38; AC-03–04. **Dependencies:** U5. **Files:** recipes/editor; `tests/unit/split-combine.test.ts`; `tests/e2e/address-recipes.spec.ts`; synthetic address fixtures.

**Approach:** KTD-03/04; each split destination reads the original source, not another result. Expose delimiter/count/segment/optional-position/trim; retain combine empties.

**Test scenarios:** Four-part address yields four trimmed fields only when requested; fifth/missing required segment is invalid; configured empty optional position remains unambiguous. Combine ordering/literals/separator and empty positions are exact. Unsupported recipe dependencies are rejected.

**Verification:** Source→transformed download, exception row/field references and workflow schema tests; existing privacy/10,000-row smoke tests.

### U7. Exact calculations and numeric validation

**Goal:** Convert units to cases and cases to weight without inferred factors or hidden rounding.

**Requirements:** R3/R4; FR-15–16,19–20,43; AC-05–06,10. **Dependencies:** U6. **Files:** `src/engine/decimal.ts`, recipes/validation/editor; `tests/unit/{decimal,numeric-validation}.test.ts`; `tests/e2e/calculations.spec.ts`.

**Approach:** KTD-04 exact arithmetic, terminating-division guard, explicit precision/mode controls. Whole-number and decimal-scale validation are distinct from parsing. Bound malicious decimal sizes before computation.

**Test scenarios:** 24÷4=6; 15×12=180; 0.1+0.2=0.3; subtraction and typed negatives work. Missing/non-numeric operands and zero divisors fail; zero operands in otherwise valid operations produce the correct result. 1÷3 fails without rounding; configured modes yield expected ties/negative results. Fractional cases fail whole-number validation even if a rounding rule exists. Large text identifiers do not become numbers; precision overflow is visible.

**Verification:** Exact decimal strings/export bytes and browser-configured calculations; extend 10,000-row smoke fixture with arithmetic and privacy tests.

### U8. Explicit date formats

**Goal:** Reformat known source dates into the chosen target pattern without locale guessing.

**Requirements:** R3/R4; FR-19–20,41; AC-09 text dates. **Dependencies:** U7. **Files:** `src/engine/dates.ts`, validation/editor; `tests/unit/dates.test.ts`; `tests/e2e/dates.spec.ts`.

**Approach:** KTD-04 strict calendar parser and three pattern choices; date constraints and modifiers must be compatible.

**Test scenarios:** `10/08/2026` under MM/DD/YYYY becomes `2026-10-08`; `03/04/2026` changes interpretation only when user changes pattern. Impossible dates, invalid leap days such as `2023-02-29`, and unsupported datetime text fail; valid leap days such as `2024-02-29` succeed. Results do not change across browser timezones; optional blank date succeeds, required blank fails.

**Verification:** Calendar/golden bytes and graphical date configuration, timezone browser tests, privacy regression.

### U9. Metadata-aware Excel input

**Goal:** Choose a worksheet, inspect typed/displayed cells, and export its correctly interpreted data to CSV.

**Requirements:** R1/R6/R7; FR-01–06,36–37,41,47; AC-08–09 Excel input,17 input. **Dependencies:** U1 and U8. **Files:** `src/formats/xlsx.ts`, worksheet UI; `tests/unit/xlsx-import.test.ts`; `tests/e2e/excel-input.spec.ts`; synthetic workbook fixtures; `docs/decisions/excel-fidelity.md`. U1 proved the guard necessary: add `src/formats/archive-budget.ts` and `tests/unit/archive-budget.test.ts` using the native streaming preflight qualified in [the Excel decision](../decisions/excel-fidelity.md); no archive reconstruction or production fflate dependency.

**Approach:** Implement U1's qualified approach under KTD-01/04/07 before enabling the file picker option. Introduce the qualified XLSX dependency into the application here; include fflate/preflight/reconstruction only when U1 justifies them. Reuse the early fixtures and repeat tests against the integrated worker. Preserve first-nonblank headers, one selected worksheet, provenance and cached-formula warnings. Header-only XLSX templates remain names/order only; extend workflow reuse/portable round trips with worksheet/import settings.

**Test scenarios:** Literal and zero-padded `001234`; suspicious numeric identifier warning; both date epochs and invalid serials; cached formula warning and missing referenced cache invalidity, no evaluation. Multiple worksheets require selection, blanks/footer rows retain semantics. Encrypted/corrupt ZIPs, forged expansion sizes, duplicate entries and excessive worksheet dimensions fail boundedly without networking. A failed replacement retains the prior run.

**Verification:** Inspect raw/display/type metadata and CSV bytes; hostile archive budget/cancel tests; 10,000-row Excel input measurement and privacy tests including external links.

### U10. Value-only typed Excel export

**Goal:** Download CSV→XLSX and XLSX→XLSX with selected column order and correct cell types.

**Requirements:** R6/R7; FR-28,45,47; AC-08–09 output,17 Excel output. **Dependencies:** U9. **Files:** XLSX writer/output controls; `tests/unit/xlsx-export.test.ts`; `tests/e2e/excel-output.spec.ts`; expected workbook semantic fixtures.

**Approach:** KTD-07 fresh workbook, explicit text/number/date cells and numeric representability check; no source active content copied. Extend U4's saved/portable round trips with XLSX output options and each delivered destination type.

**Test scenarios:** Leading-zero and formula-like text remain strings with no formula property; dates retain calendar meaning/timezone independence; exact decimal-safe result writes only if representable; over-precision numeric export fails rather than silently loses digits. Selected columns/order/blanks are preserved and source links/formulas absent.

**Verification:** Independently inspect workbook ZIP/XML types and content in addition to rereading with the writer library; browser-download tests for both source formats, privacy and performance regressions.

### U11. Session source correction and safe reupload

**Goal:** Fix an invalid source value in the app, compare it with the original, or replace the file safely under the same rules.

**Requirements:** R3/R4; FR-17,23–24,27; AC-13–14. **Dependencies:** U10. **Files:** correction overlay/session controller/review UI; `tests/unit/corrections.test.ts`; `tests/e2e/correction-reupload.spec.ts`.

**Approach:** KTD-05/08; source edit recalculates the affected whole row; rule edit recalculates the full dataset. Typed/display original input remains visible, active replacement is explicit and source-only.

**Test scenarios:** `Twenty Four`→`24` repairs every dependent calculation, original inspectable and workflow JSON unchanged. Revert restores original status. Clearing a row does not remove its candidate identity. Reupload warns before discarding corrections; cancelled/failed replacement preserves them. Cancel a replacement while parsing with existing corrections: worker restart restores prior provenance, counts and exported corrected values, with export blocked until recovery finishes. Fast edits/rule changes cannot install stale worker output; reload discards dataset and edits only.

**Verification:** Source identity/provenance/count invariants and browser correction/download tests, full correction-stage privacy interception and 10,000-row correction measurement.

### U12. Full exception review and acknowledged partial export

**Goal:** Inspect every exception and explicitly export all eligible rows when invalid records remain.

**Requirements:** R4/R6; FR-22,25,44; AC-15. **Dependencies:** U11. **Files:** issues/summary/session controller/review UI; `tests/unit/export-eligibility.test.ts`; `tests/e2e/partial-export.spec.ts`.

**Approach:** KTD-05/06; counts and excluded references cover the full dataset regardless of preview page. No exception-download dependency (FR-26 deferred).

**Test scenarios:** Of 500 candidates, 490 eligible including warning-only rows and 10 invalid: exact visible counts/refs, no download before acknowledgement, exactly 490 exported. Hidden-page errors are included; warnings stay visible. Edit, new file, rules or export-option changes invalidate stale acknowledgement. Workflow errors/pending runs/zero eligible rows cannot export.

**Verification:** Exact downloaded record set and excluded provenance, acknowledgement-state tests, paginated exception accessibility and privacy regressions.

### U13. Integrated release qualification and demonstration

**Goal:** Present a useful, documented release candidate that satisfies every MUST, not a collection of isolated demos.

**Requirements:** R1–R10 integrated; all AC-01–22; PRD §11–12. **Dependencies:** U12. **Files:** sample source/template/completed workflow; `tests/e2e/{sample-journey,release,performance}.spec.ts`; README/setup/help docs; static hosting/CSP instructions; necessary stale ancillary PRD references; release test report.

**Approach:** Integrate existing tests and UI, do not postpone correctness/accessibility until here. Qualify full synthetic logistics workflow, under-500 and 10,000-row CSV/XLSX paths, local/static builds and measured budgets. Update capability claims only from passing evidence. Offer repository/custom-services links without inventing results or ROI. Correct existing obsolete PRD paths in ancillary docs as part of release documentation, not by editing the authoritative PRD.

**Test scenarios:** A fresh visitor runs sample data; a new operator configures and saves; another browser imports backup; compatible daily run succeeds without editor. Invalid row correction and partial export both preserve counts/types/safety. All required source/target combinations work, keyboard journeys on laptop screens work, production privacy/CSP hold. TMS limitations and clearable browser storage are disclosed.

**Verification:** Full release matrix below, recorded reference-device timing, dependency/security review and reproducible setup/build. Choose host with required response-header support; actual deployment/publication requires separate user approval.

---

## Verification Contract

Each unit introduces its own executable tests. Subsequent units run earlier tests; no mock-only format, schema or privacy acceptance. Use synthetic fixtures exclusively and preserve CSV byte attributes already in the repository.

Execution checkpoints: U1's recorded feasibility pass precedes substantial application work; U2's observed UX checkpoint precedes acceptance of the first visual CSV slice. U4 demonstrates save/reopen/backup/reuse with simple CSV recipes; U5 demonstrates suggestions and persistence of confirmed mappings. U6–U10 must extend storage/portable round-trip tests for each newly delivered recipe, modifier, validation or format setting. A gate's limited probes never replace full production-build privacy tests or integrated release acceptance.

| Acceptance scenarios | Primary unit(s) | Evidence |
| --- | --- | --- |
| AC-08–09,17 XLSX qualification | U1; acceptance repeated in U9/U10 | Early fidelity/date/formula/resource evidence and simplest-approach decision; not full acceptance |
| AC-01,11,22 baseline | U2 | Real sample/manual mapping and exact download/counts |
| AC-02 | U5 | Accepted/rejected suggestions and negative dictionary cases |
| AC-03–04 | U6 | Explicit split/combine outputs and row errors |
| AC-05–06,10 | U7 | Exact decimal strings, invalid operands and rounding boundaries |
| AC-07 | U3 | Typed fixed values and intentional blanks |
| AC-08 | U2,U9,U10 | CSV/XLSX identifiers and uncertainty warnings |
| AC-09 | U8–U10 | Explicit patterns, epochs, calendar/type fidelity |
| AC-12,18–19 | U4 | Header compatibility, saved/portable meaning and safe failures |
| AC-13–14 | U11 | Original/edited provenance, replacement and stale-reply protection |
| AC-15 | U12 | Eligible download set, exact exclusions and acknowledgement |
| AC-16 | U2,U3 | UTF-8/BOM/delimiter/header/quoting/CRLF byte goldens |
| AC-17 | U2,U9,U10 | CSV choices, no formula execution and literal Excel cells |
| AC-20 | U2 onward | Production-context request interception at every added stage |
| AC-21 | U2 onward; full U13 | 10,000-row completeness/responsiveness and measured timings |
| AC-22 full demonstration | U13 | Sample logistics workflow with all released capabilities |
| AC-23 | Deferred | Required only if FR-42 is later included |

Proposed real scripts established in U2: `npm run typecheck`, `npm run test:unit`, `npm run build`, `npm run test:e2e`, `npm run test:privacy`, `npm run test:performance`. Browser tests use a production build served locally, not development/HMR output. Build/test commands are planned, not available or run in this documentation-only repository today.

Privacy tests install interception on the whole browser context before application load; block service workers; allow only known static asset paths/methods, and fail any other request, beacon, fetch, XHR, form submission or WebSocket attempt. Inject distinctive sentinels in file bytes, names, record IDs, corrections and constants; inspect outgoing URLs/headers/bodies and console/diagnostics. Exercise all added stages and storage/portable JSON exclusions. [Playwright's network documentation](https://playwright.dev/docs/network) explains why context-wide interception and service-worker handling matter. CSP is checked independently, not used instead of observed network assertions.

Domain tests cover repeatable evaluation, header normalization collisions, candidate/count identities, recipe independence, all decimal/date failure branches and workflow semantic validation. Property-based-style generated loops can use deterministic seeded fixture builders; no extra testing dependency is necessary initially. Adapter tests include malformed bytes/quotes, quoted multiline provenance, workbook raw/display/type distinctions, archive budgets and literal-cell XML inspection. Browser tests compare actual downloads, not only displayed previews. For XLSX, inspect XML/type metadata independently to avoid a reader/writer pair hiding the same error.

Failure tests include worker cancellation/crash, parser/import failures, storage denial/quota/corruption, conflicting workflow imports, stale requests, oversized hostile inputs, no eligible export rows and acknowledged export invalidation. Errors must contain useful row/field/action information but no transmitted customer data. Keep representative byte fixtures and stage timings in reproducible test reports.

### Confidence and review

The product contract, architecture and safeguards are preserved. The original seven-lens review's corrections for zero operands, valid leap days and worker recovery remain binding; its coverage does not certify the revised sequence. Remaining Excel mechanism feasibility is now an explicit U1 gate, before application work, with integrated checks in U9/U10/U13. U2 adds an observed usability checkpoint; performance targets remain provisional. No qualification probes or implementation tests were executed during this planning revision, and no unsupported assumption permits omission of a MUST.

---

## Definition of Done

- All PRD MUST requirements and AC-01–22 pass against synthetic fixtures and actual export data/bytes. SHOULD acceptance applies only if the corresponding capability is included; the three named SHOULD capabilities are deferred.
- U1 supplies the recorded feasibility decision and evidence; U2–U13 deliver their demonstrated vertical paths with tests, actionable failures and privacy assertions. U2's early UX checkpoint is completed and subsequent capabilities extend workflow round-trip coverage. No full-MVP claim from an earlier internal slice.
- Workflow version 1, independent engine, complete provenance/status counts, source-only session edits, safe replacement and explicit export decisions are exercised end to end.
- Full 10,000-row CSV/XLSX pipeline, preview, correction and export are qualified on the recorded reference environment; deviations from proposed targets are resolved with evidence and approval.
- Static/local distributions share behavior, all dependencies are pinned/qualified, no uploaded content is transmitted or persisted, and untrusted files cannot introduce executed formulas/scripts.
- Setup/help/limitations/privacy/backup documentation and synthetic sample workflow are accurate; no unsupported vendor or business claims. Publication is separately approved.
- This planning turn ends with the plan presented for review. No implementation, dependency installation, ce-work, deployment, commit or PR is authorized by creating this artifact.
