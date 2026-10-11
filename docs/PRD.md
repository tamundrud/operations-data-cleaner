# Operations Data Cleaner — Product Requirements Document

**Version:** 0.2 (revised draft for product review)  
**Date:** October 9, 2026  
**Status:** Revised after two independent PRD reviews; product decisions proposed for approval before `ce-plan`  
**Intended handoff:** Compound Engineering in Codex (`ce-doc-review` → `ce-plan`)  

**Revision summary (v0.1 → v0.2):** Defined fixed-field constants, recipe composition, one-to-one row semantics, explicit date and decimal rules, CSV/Excel fidelity and export settings, schema matching, warning/error behavior, workflow versions, formula-injection safeguards, and executable acceptance examples. Retained in-app source correction because it was explicitly selected during discovery; moved its implementation to a later vertical slice.

## 1. Executive summary

**Operations Data Cleaner** is a free, open-source, browser-based application for preparing transportation and logistics data for use in another system. Its first use case is converting customer or partner order exports into the structure required for import into a transportation management system (TMS).

A user uploads a CSV or Excel file, defines or imports the desired output structure, visually maps columns, applies basic transformations, previews and validates the output, resolves exceptions, and downloads an import-ready file. The configuration can be saved as a reusable workflow in the browser and backed up or shared as a portable file. Subsequent runs should require little more than selecting the workflow, uploading new data, reviewing any exceptions, and exporting.

All customer data processing takes place locally in the browser. Accounts, server-side data processing, cloud storage, and paid services are **not** part of the free MVP.

The project's **primary objective** is to deliver a useful, polished, public demonstration of solving real operational data problems. A secondary opportunity is to attract users and future consulting engagements involving more complex transformations, integrations, and automation. Commercial traction is not a prerequisite for completing the MVP.

## 2. Problem and evidence

### 2.1 Problem statement

Smaller transportation providers and third-party logistics (3PL) operators often receive order exports from customers whose systems they do not control. These files may use different column names, structures, addresses, units, codes, and data formats than the logistics provider's TMS expects.

Staff may repeatedly rearrange columns in Excel, rename headers, copy formulas, split or combine fields, or manually re-enter orders. Even when the source structure stays consistent, the work recurs whenever a new order file arrives. Failed imports can create delays and rework; manual re-entry can also introduce errors in references, quantities, and weights.

### 2.2 Observations informing this PRD

These are practitioner observations from discovery, **not independently validated market-size or adoption claims**:

- A common file-preparation task may require roughly **15–30 minutes per run**, often daily and sometimes several times per day.
- Files are usually **under 500 rows**, sometimes under 50, and are unlikely to exceed **10,000 rows** for the intended initial use case.
- Within a given customer relationship, source file structure tends to be stable; the data values change.
- A more technically inclined dispatcher, administrator, supervisor, or manager may configure a workflow, but the application must also be usable by someone with only basic spreadsheet experience.
- Many file-transformation mistakes result in rejected TMS imports and lost time. Incorrect manual data entry can create more serious operational or billing consequences.
- An adjacent real-world example—combining TMS, order management system (OMS), and payroll exports for driver productivity reporting—demonstrates demand for broader reconciliation, but is **not** the first-release focus.

### 2.3 Job to be done

> When I receive a customer's order export that doesn't match my TMS import format, help me convert it accurately and repeatably without rebuilding an Excel process or asking IT for a custom integration.

## 3. Product goals, audience, and positioning

### 3.1 Goals

1. **Practical utility:** Reliably convert ordinary customer order exports into a user-defined, TMS-ready CSV or Excel table.
2. **Low learning curve:** Make first-time configuration understandable to users familiar with spreadsheets but not programming.
3. **Repeatability:** Save transformations so recurring files do not need to be remapped each time.
4. **Trust:** Give users visibility into proposed mappings, transformations, exceptions, and output; process data locally.
5. **Portfolio quality:** Make the public application demonstrable, documented, tested, and available as open source.
6. **Extensibility:** Avoid architectural dead ends that would prevent later multi-source reconciliation, hosted automation, or optional AI/Decisions API assistance.

### 3.2 Primary users

- **Workflow creator:** Dispatcher, administrative employee, supervisor, or operations manager setting up an import transformation. May have modest Excel skills and limited technical support.
- **Daily operator:** Employee applying an existing workflow to incoming files. Must not need to understand how its rules were originally configured.
- **Ad hoc user:** Person preparing a one-off file who should not be forced to save a workflow or create an account.

### 3.3 Positioning and business model

- Free browser-hosted tool and openly available source code.
- Logistics-aware field suggestions provide useful domain context without making unsupported assumptions.
- No registration required for core functions.
- Public demo and a discreet route to inquire about custom services may support consulting opportunities.
- Later paid possibilities (not commitments): managed/shared workflows, integrations, unattended processing, complex reconciliation, and optional hosted decision services.

## 4. MVP use case and boundaries

### 4.1 Primary scenario: customer order export → TMS import file

A 3PL receives a CSV or Excel export from a customer. The file's column names, order, and some values do not match the TMS import requirements. The operator uploads the source and defines the destination format—by uploading a template or header-only sample, entering destination columns manually, or selecting a saved destination schema. The application suggests field matches, and the user finalizes mappings and transformations. It then validates and exports the result.

The output is a **data file ready for the user's existing TMS import process**, not a direct TMS integration. Application validation does not guarantee acceptance by a proprietary TMS unless its import requirements have been configured correctly.

### 4.2 Exact MVP boundaries

| Included in MVP | Deferred / out of scope for MVP |
| --- | --- |
| CSV and `.xlsx` import/export; one selected Excel worksheet | PDF, scans, OCR, multi-worksheet joins, multi-table layouts |
| One structured source table; one output record per nonblank source data row before exclusions | Aggregation, row expansion, one-to-many records, header/detail conversions |
| Visual destination-field recipes: copy, constant, split, combine, calculate | Arbitrary multi-step rule chains, scripts, dependencies between destination columns |
| Simple date reformatting, field-aware trimming, explicit numeric conversion | General locale inference, geocoding, free-form address parsing |
| Deterministic logistics-aware mapping suggestions with human confirmation | AI-dependent or fully automatic mapping |
| Basic data validation, warning/error review, per-session source correction and reupload | Enterprise approval workflows, multi-user collaboration, persistent row history |
| Browser-stored workflows and portable configuration files | Cloud sync, centralized workflow libraries, accounts |
| Local-browser processing and static hosting | Uploaded-data servers, unattended processing, direct TMS APIs |
| Exact-match replacement rules (SHOULD) | External product/location lookup/reference-table engine |

**Scope principle:** Build a useful, repeatable order-export-to-TMS transformation tool—not a driver-productivity reporting application, universal ETL platform, or certified TMS integration.

**No implicit expansion:** A typical source file already represents the correct destination record granularity. If one order requires combining multiple source rows, users need a separate workflow outside the MVP.

## 5. Experience principles

1. **Visual first, walkthrough optional.** Uploading a file should lead directly to a recognizable table/column-mapping workspace. Hints and suggested next steps should be available in context but not required.
2. **See input and output.** The effect of mapping or transformation changes should be visible in a representative output preview.
3. **Clear controls over hidden gestures.** Drag-and-drop may be supported, but every necessary action must also have an obvious labelled control (e.g., dropdowns, move actions).
4. **Progressive complexity.** Basic mapping is prominent; splitting, combining, arithmetic, and validations are available when needed.
5. **Operator speed.** Running a saved workflow should take fewer actions than configuring one, and should not reopen the editor unless something needs attention.
6. **Never silently guess on consequential ambiguity.** Suggested mappings require human confirmation during initial configuration; malformed and unresolved records are visible.
7. **Preserve source integrity.** Distinguish identifiers from quantities; never strip meaningful leading zeros or coerce identifiers to numbers automatically.
8. **Plain language.** Use understandable labels such as “Missing Delivery Date,” not only technical error messages.

### 5.1 Proposed high-level navigation

- **New transformation** → Upload source → Define target → Map and transform → Preview/review → Export → Optionally save.
- **Saved workflows** → Choose workflow → Upload source → Process/review → Export; option to edit the workflow.
- **Examples/help** → Try synthetic logistics sample files and a completed demonstration workflow.

These are functional flows, not a commitment to a particular page layout.

## 6. User journeys

### Journey A — First-time or ad hoc transformation

1. Open the website without signing in; upload an ordinary CSV or `.xlsx` source (choose one worksheet if needed).
2. Define destination fields from a header-only example, manual column list, or previously saved definition.
3. Inspect source headers and preview values, then accept or override optional field-mapping suggestions.
4. For each destination field, select a visual recipe (copy, fixed value, split segment, combine, or arithmetic) and optionally configure trimming, a supported date format conversion, and field validation.
5. Preview the result and inspect any workflow errors, invalid rows, or warnings.
6. Correct invalid source values in the current session **or** replace the uploaded file after fixing it externally.
7. Export all valid records, or explicitly acknowledge any invalid rows excluded from a partial export. Make the chosen CSV export settings visible.
8. Optionally name and save the workflow in the browser, with a prominent option to download its portable backup.

### Journey B — Repeat use

1. Open a named workflow in this browser or import a portable configuration file.
2. Upload a new file. Source columns are matched by unique normalized header names, **not column positions**. Reordered columns and extra unused columns are tolerated; missing required columns or duplicate normalized headers block processing.
3. Review results and exceptions; users need not reopen the editor if the file is compatible.
4. Correct or reupload, then export. If rules need changing, open the visual editor, update them deliberately, and save the revised workflow.

### Journey C — Workflow backup, portability, and recovery

1. Save a named configuration in browser storage; display a prominent, nonblocking prompt to download a portable copy on first save.
2. Transfer the workflow file between browsers, devices, colleagues, and hosted/local versions. Explain that browser-saved workflows are not shared automatically.
3. If browser data is cleared, import the portable workflow and use it with a compatible source file.
4. Configuration exports contain rules, field names, validation settings, and user-defined constants, **not sample row values, uploaded datasets, or filenames**. Warn that business-specific constants or field names may themselves be sensitive.

## 7. Functional requirements

Priority terms: **MUST** = required for the full MVP; **SHOULD** = useful but may be moved to a subsequent release without undermining the core job; **LATER** = explicitly deferred. Earlier vertical slices may be released for internal demonstration before the entire MVP is complete.

### 7.1 File input, row model, and destination schema

- **FR-01 (MUST):** Accept ordinary CSV and `.xlsx` files containing one rectangular table with a header row and data rows, locally without transmitting data to a backend. Support UTF-8 CSV with and without BOM; parse standard quoted fields including delimiters, escaped quotes, and embedded newlines. Source delimiters may be comma, semicolon, or tab, with detection verified or explicitly selected by the user. Malformed/other encodings must produce an actionable error rather than silent corruption.
- **FR-02 (MUST):** For `.xlsx`, allow choosing one worksheet. Do not merge sheets.
- **FR-03 (MUST):** Show detected source headers, representative cell display values, and source row references before configuration.
- **FR-04 (MUST):** Define destination fields and their order by (a) a sample/header-only file, (b) manual entry, or (c) an existing workflow/destination definition.
- **FR-05 (MUST):** Add, delete, rename, and reorder destination columns. A header-only file defines **names/order only**, not types or business rules; any suggested constraints remain user-editable.
- **FR-06 (MUST):** Reject unsupported/unreadable files with actionable messages; do not silently omit meaningful data.
- **FR-35 (MUST):** **One-to-one row policy:** Each nonblank source data row generates exactly one candidate output record; invalid records may later be deliberately excluded. Completely blank rows are skipped and counted separately. Nonblank totals/footer rows are **not** silently detected or discarded; they are processed as records and may fail configured validation. Aggregation, deduplication, and one-to-many conversions are not included.
- **FR-36 (MUST):** Interpret `.xlsx` cell **value, data type, and display formatting** without automatic coercion of identifiers. Preserve text identifiers literally, including leading zeros. For numeric values displayed with zero-padding, preserve the display representation where supported by workbook formatting, but do not claim to recover digits already lost when Excel stored an identifier as a number. Detect/warn on suspicious high-precision numeric identifiers and unsupported formats. Treat Excel date serials using workbook date metadata rather than as arbitrary numbers.
- **FR-37 (MUST):** Recognize the first nonblank row as the header row for an ordinary table. Require unique nonempty column names after basic normalization; duplicate/blank headers block processing with instructions for correcting the source. Alternate header-row selection and irregular workbooks are outside the MVP.

### 7.2 Mapping, recipes, and logistics-aware suggestions

- **FR-07 (MUST):** Provide graphical controls for associating each destination field with a source field or supported recipe. Users can replace and remove mappings without code; all required interactions have labeled alternatives to drag-and-drop.
- **FR-08 (MUST):** Propose deterministic field matches using normalized header names and a curated logistics terminology dictionary. Examples: `Ship To` ↔ `Consignee` and `PO #` ↔ `Purchase Order Reference`, when context supports them. Do not assert ambiguous logistics terms are identical merely because they are related.
- **FR-09 (MUST):** Visually distinguish suggested, confirmed, and unmapped fields. A user explicitly accepts or changes a suggestion during setup; suggestions do not become confirmed silently.
- **FR-10 (MUST):** Save confirmed mappings and recipes with the workflow and identify incompatible source headers on subsequent runs.
- **FR-11 (SHOULD):** Show short reasons for suggestions when useful (synonym match, name similarity).
- **FR-38 (MUST):** **Destination-field recipe model:** Each output field has exactly one primary recipe: copy a source field; emit a fixed literal; use a configured segment of one source field; concatenate selected source fields/literals; or compute one supported arithmetic operation over source fields and/or fixed numeric constants. A field can additionally have an explicit trim or minimal date-format operation and validation settings. **MVP recipes cannot depend on other output fields**, invoke arbitrary code, or form general chained pipelines. All source fields referenced by a recipe are required by that workflow.
- **FR-39 (MUST):** On repeat runs, match source headers after trimming boundary whitespace, case-folding, and collapsing internal whitespace. Reordering of source columns and extra unused columns are allowed. Missing referenced fields or duplicate normalized names block processing; an unfamiliar but similar name requires human remapping rather than silently substituting it. Source schema expectations store header names/recipe references **without sample values**.

### 7.3 Supported transformations

- **FR-12 (MUST):** Offer explicitly selectable trimming of leading/trailing whitespace for text values. **No unannounced cleanup default** changes content; where trimming is part of a configured split/combination recipe, visibly document that rule.
- **FR-13 (MUST):** Split using a configured literal delimiter (including comma or semicolon), strict expected segment count, and explicit segment-to-destination mapping. Trim delimiter-adjacent whitespace if configured. Missing/extra segments cause a row-level error, except that a user-marked optional empty segment is permitted when its position remains unambiguous. No free-form address parsing.
- **FR-14 (MUST):** Combine two or more input fields or literal components in a chosen order, separated by a user-defined delimiter. Combining does not automatically remove empty components unless an explicit rule states it.
- **FR-15 (MUST):** Support one arithmetic operation (`+`, `−`, `×`, `÷`) per destination-field recipe, with operands from source columns and/or user-defined constants (e.g., units ÷ units-per-case; cases × weight-per-case). No custom expression language.
- **FR-16 (MUST):** Report missing/non-numeric operands, zero divisors, invalid results, and output values violating whole-number/precision constraints. Never infer conversion factors or silently round fractional cases.
- **FR-17 (MUST):** Preserve original parsed values in active memory for comparison and row provenance; keep output results and session-only corrections separately identifiable.
- **FR-18 (LATER):** External product/location lookups, conditional logic, multi-step formula pipelines, broad unit/date interpretation, free-form address parsing, and arbitrary scripts. *A limited explicit date-reformat operation is included under FR-41.*
- **FR-40 (MUST):** Support a direct **fixed-value** recipe for destination fields (text, number, or intentionally blank), without requiring a source column. Show the literal value in the editor and preserve its type in the workflow.
- **FR-41 (MUST):** Support explicit date reformatting from a configured known source format to a configured destination format, at minimum `YYYY-MM-DD`, `MM/DD/YYYY`, and `DD/MM/YYYY`. Do not guess ambiguous dates. For Excel date-formatted cells, use interpreted dates and the workbook's date system; invalid dates produce row errors. Broad locale/date inference is deferred.
- **FR-42 (SHOULD):** Allow a small inline table of exact-match text value replacements for a selected source field (e.g., `Pallet` → `PLT`), with a user-selectable rule for unmatched values (keep original or flag). This is **not** an external reference-table or relational lookup engine; implementation can follow the core MVP.
- **FR-43 (MUST):** Use decimal-safe arithmetic, avoiding binary floating-point artifacts in output. Explicitly configure output numeric precision where the target requires it. Default to no silent rounding; nonterminating division or values exceeding destination precision require an explicit rounding rule or a flagged error. A supported explicit rounding rule must identify its mode and number of decimal places.

### 7.4 Validation, corrections, and exception resolution

- **FR-19 (MUST):** Validate required fields, configured numeric/date types, maximum text lengths, missing inputs, invalid arithmetic, and failed splits. Missing optional fields do not fail merely because they are blank.
- **FR-20 (MUST):** Let users set destination field rules in the graphical UI: required/optional, basic expected data type (text, number, date), optional whole-number requirement and decimal scale, and maximum text length. Provide clear defaults without implying that TMS-specific business rules have been inferred.
- **FR-21 (MUST):** Separate **workflow-level failures** (missing required headers, duplicate normalized headers, malformed recipe, incompatible configuration) from **row-level invalid data**. Workflow-level failures block the run until resolved.
- **FR-22 (MUST):** Show counts across the **entire** dataset for input data rows, skipped blank rows, valid rows, warnings, invalid rows, corrected rows, and excluded rows. Exceptions include source row reference, field, reason, and a suggested next action.
- **FR-23 (MUST):** Allow direct editing of **source cell values in the current session** (not destination overrides). Re-run all relevant recipes and validations for the affected record after each correction. Do not persist those edits in the saved workflow or silently modify the uploaded file. Visually distinguish edited values from originals. Destination override mode is deferred.
- **FR-24 (MUST):** Let the user correct the original file and reupload/reprocess under the same workflow. Warn before replacing data if unsaved in-session corrections would be discarded.
- **FR-25 (MUST):** Permit a complete export when no invalid records remain, or a deliberate **partial export of valid and warning-only rows** after a review step that states the exact number excluded. Never silently omit invalid records or include invalid rows in a partial export.
- **FR-26 (SHOULD):** Provide a downloadable exception report listing excluded source rows, fields, reasons, and record references.
- **FR-44 (MUST):** Define statuses: **Valid** passes all requirements; **Warning** passes hard requirements but is potentially problematic and may be exported with a visible warning; **Invalid** violates a required rule and cannot be exported until corrected or explicitly excluded. Workflow-level errors block export. Validation covers the full dataset, not merely previewed rows.

### 7.5 Preview, export format, and workflow lifecycle

- **FR-27 (MUST):** Preview destination headers in exact output order, representative transformed records, and exception changes without hiding non-previewed failures. Recalculate preview when recipes change or values are corrected.
- **FR-28 (MUST):** Export CSV or `.xlsx` with only selected fields, in configured column order. A preview that passes configured checks does not guarantee vendor-certified TMS acceptance.
- **FR-29 (MUST):** Allow ad hoc use without creating an account or saving anything.
- **FR-30 (MUST):** Persist named declarative workflows in browser storage (IndexedDB preferred): normalized source header expectations, destination field recipes, date/number rules, validation and export format settings, and schema version. No uploaded source rows, sample cell values, or filenames may be persisted in the workflow.
- **FR-31 (MUST):** Import/export portable versioned JSON workflow files compatible between hosted and locally run variants. No executable scripts or raw uploaded datasets; explain that configuration metadata and constants may reveal business information.
- **FR-32 (MUST):** Clearly state that browser storage can be cleared and workflows are browser-specific; prominently encourage a downloadable backup on first save and provide persistent access to Download workflow.
- **FR-33 (MUST):** Reject malformed/unsupported workflow files safely; never evaluate user-provided executable content.
- **FR-34 (MUST):** Ship synthetic source data, destination template, and at least one functional example workflow from the first implementation slice. These double as reproducible golden-file tests.
- **FR-45 (MUST):** **CSV export contract:** By default export UTF-8 without BOM, comma delimited, with a header row, standard double-quote escaping for delimiters/quotes/newlines, and CRLF row endings. Let users configure at least delimiter (comma, semicolon, tab), UTF-8 BOM on/off, and header row present/absent. Include selected settings in saved workflows. A target needing a different encoding or special quoting convention may not be supported by the MVP; disclose that limitation. `.xlsx` export respects configured destination fields and cell types.
- **FR-46 (MUST):** **Workflow schema versioning:** Include a required format-version field from the first release. Reject unsupported newer versions with a clear explanation. When older versions are supported, migrate them through explicit, tested version-to-version migrations rather than implicit guessing; never silently reinterpret a rule.
- **FR-47 (MUST):** **Spreadsheet formula safety:** Treat source `.xlsx` formula cells as untrusted; do not execute formulas. If a cached result is read, mark its provenance and warn that it may be stale; missing/unusable cached results are invalid if required by a recipe. Write Excel output text cells as literal strings, never executable formulas. For CSV text that might be interpreted as a spreadsheet formula, visibly flag the risk and require a choice between an escaped spreadsheet-safe representation (which alters bytes) and exact raw text for TMS import (which may be unsafe to open in spreadsheet software). Never silently modify destination text or treat legitimate typed negative numbers as malicious formulas.

## 8. Processing, data integrity, and safety semantics

The processing model is **parse source → inspect/schema-check → configure recipes → transform each data row → validate → review/correct/reprocess → export**. The transformation engine must be deterministic and independent of the UI and browser persistence.

### 8.1 Source and record semantics

- A run contains source header metadata, raw parsed cells (with original type/display information when available), original file row indices, session-only source edits, candidate transformed rows, and issues. Only workflow configuration persists across sessions by default.
- Identifiers are text unless the user explicitly configures numeric interpretation. CSV values are initially treated as strings; destination-specific numeric/date operations perform deliberate parsing.
- Do not claim to recover leading zeros or numeric precision already discarded by Excel before the file was uploaded. Where numeric display formatting can safely produce zero-padded text, preserve it; flag fidelity uncertainty otherwise.
- Each nonblank source data row produces one candidate record, with a stable source row identifier. Blank rows are counted but not silently included in output. Nonblank summary/footer rows are **not** automatically dropped.
- No implicit deduplication, aggregation, joins, product catalogs, row expansion, or column-to-row transformation.

### 8.2 Recipe and execution semantics

- Each destination field is computed independently from original or in-session-corrected **source** cells plus configured constants. The recipes cannot depend on transformed destination fields, making evaluation order irrelevant.
- For split rules, the delimiter and expected segment positions are explicit. Extra segments are errors; missing required segments are errors. No heuristic reconstruction of unstructured addresses.
- Arithmetic uses decimal-safe representation. Conversion factors are configured or provided by a source column, never inferred. Where exact decimal division is not possible at required output scale, the user must explicitly choose rounding or the row is flagged.
- Basic date formatting uses explicit source and target patterns. Unrecognized, impossible, or ambiguous dates are errors, not guessed.
- Every in-app correction replaces a source cell **for the active run**; all dependent destination recipes are recalculated, and the original source value remains inspectable. Changing a workflow rule reprocesses the active dataset and does not automatically persist that rule until explicitly saved.

### 8.3 Issue statuses and exports

- **Workflow error:** The configuration or source schema is unusable; block transformation/export until resolved.
- **Invalid record:** Violates at least one required rule; cannot be included in an export.
- **Warning-only record:** No required rule failed, but there is a non-blocking concern; export permitted with visible warning.
- **Valid record:** Meets configured requirements with no warnings.
- **Partial export:** Deliberate, acknowledged selection of all valid and warning-only rows while invalid rows remain excluded. Report the exact excluded count against the full source dataset and offer an exception report. No auto-exclusion without confirmation.

### 8.4 Source schema compatibility

- Match referenced headers using simple deterministic normalization: trim boundary whitespace, collapse internal whitespace, and case-fold. Do not use fuzzy matching to **automatically** substitute a changed header.
- Reordered source columns and extra unused columns are compatible. Missing required headers, blank headers, or duplicate normalized headers block processing, with plain-language explanation.
- Header names and recipes, but not sample row data, may be stored with a saved workflow.

### 8.5 Privacy and hostile-content boundaries

- No data-bearing requests to a server, AI endpoint, or analytics service during processing; the app may fetch static code/assets from the hosting origin.
- Treat imported workbook cells and workflow JSON as untrusted. Do not execute spreadsheet formulas or code supplied through workflow rules.
- Excel string cells must remain strings in exports. CSV formula-like content requires explicit handling because exact raw TMS bytes and spreadsheet-opening safety can conflict; never make silent destructive alterations.

## 9. Non-functional requirements

### 9.1 Privacy and security

- **NFR-01:** All source-file parsing, mapping, transformations, validation, corrections, and export occur on the user's device. No uploaded record content is sent to an application server or external model service.
- **NFR-02:** Core functions need no account, upload API, cloud database, or server runtime; the public version should be deployable as static website assets.
- **NFR-03:** Source data and session-only edits are not persisted by default. Reloading/ending the session discards them, while configurations remain in local workflow storage.
- **NFR-04:** Workflow files may expose field names and user-configured constants; indicate this when users download/share workflows. No customer records, uploaded file names, or record identifiers may leak into analytics, logs, or crash reports.
- **NFR-05:** Verify privacy with automated request interception and browser tests **from the first slice**. Use a restrictive Content Security Policy and explicitly test that no file contents reach network destinations, including same-origin endpoints. CSP alone is not proof of privacy. Document static asset fetches distinctly from user-file transmission.
- **NFR-06:** Prevent spreadsheet formula execution and accidental active formulas in exported Excel, and address CSV formula injection as in FR-47.

### 9.2 Performance and reliability

- **NFR-07:** Optimize for under 500 rows; test complete processing, validation, preview, corrections, and export with representative files up to 10,000 data rows on a documented reference browser/device. Avoid a hard 10,000-row cap without evidence.
- **NFR-08:** Do not leave the interface unresponsive during substantial processing. Provide busy/progress states when necessary; performance numbers and test environment will be selected during `ce-plan`.
- **NFR-09:** Loading/exporting and re-importing a workflow must retain meaning across supported versions. Round-trip golden tests must cover identifiers, dates, decimals, delimiters, quotes, blanks, and spreadsheet safety.
- **NFR-10:** Input records, source-row references, total counts, warning counts, and exclusions must remain correct regardless of preview size or pagination.

### 9.3 Usability and accessibility

- **NFR-11:** Desktop-first; function well on common laptop screens. Mobile workflow editing is not a release requirement.
- **NFR-12:** First-time mapping should be discoverable without mandatory onboarding, code, or advanced spreadsheet formulas.
- **NFR-13:** Provide accessible, keyboard-operable alternatives to drag-and-drop, visible focus states, clear labels, and appropriate contrast.
- **NFR-14:** Messages state the problem, affected row/field, and suggested action. Explain the distinction between correct file structure and guaranteed destination-system import acceptance.

### 9.4 Open-source delivery

- **NFR-15:** Share the same application and workflow format between hosted and locally run open-source distributions; do not require a native desktop app.
- **NFR-16:** Publish setup/build documentation, selected open-source license, representative synthetic fixtures, and automated tests for transformations, formats, schema compatibility, privacy, and failure cases.

## 10. MVP acceptance scenarios (intended as executable tests)

All examples must be implemented with synthetic fixtures; tests should check actual downloaded file content, error status, and transformed data—not just UI snapshots or code inspection.

- **AC-01 — Basic conversion:** Given a customer CSV and destination header template, a user can visually map, rename, reorder, preview, and export **exactly** the selected columns in order.
- **AC-02 — Suggestions:** `Ship To` suggests `Consignee`; the user can accept or reject it. Related-but-not-equivalent identifiers are not silently confirmed.
- **AC-03 — Address split:** `123 Main St, Vancouver, BC, V5K 0A1` splits into four trimmed fields under an explicit comma rule; an unexpected fifth or missing required segment becomes invalid.
- **AC-04 — Combine:** Selected source text fields concatenate in the configured order with the selected separator.
- **AC-05 — Column conversion:** Given 24 selling units and four selling units per case, division yields six cases; a zero or missing factor creates an invalid record.
- **AC-06 — Constant arithmetic:** Given 15 cases and `12 kg/case` as a configured constant, multiplication yields 180 kg.
- **AC-07 — Fixed output values:** A destination `CustomerCode` or `ServiceType` field outputs a specified fixed literal in every applicable row without a source column.
- **AC-08 — Identifier fidelity:** A CSV text reference `001234` is unchanged. An `.xlsx` text reference is unchanged. An `.xlsx` numeric cell 1234 formatted as `000000` yields the six-digit displayed reference where safely derivable; a value previously rounded by Excel is **not** claimed to be recoverable. Long numeric identifiers trigger a warning when fidelity is uncertain.
- **AC-09 — Minimal date reformat:** With explicitly selected source `MM/DD/YYYY` and destination `YYYY-MM-DD`, `10/08/2026` converts to `2026-10-08`; `03/04/2026` is interpreted only under the selected source pattern, not guessed. Invalid dates fail validation. Excel date cells use workbook metadata.
- **AC-10 — Decimal correctness:** `0.1 + 0.2` produces exactly `0.3` at the configured output scale. A nonterminating fraction requires explicit precision/rounding rules or raises an error, and a fractional case fails when whole cases are required.
- **AC-11 — One-to-one rows:** Ten nonblank data rows yield ten candidate output rows. Two entirely blank rows are skipped and counted. A nonblank totals row is **not** silently discarded; it is processed and can fail validation. No grouping or deduplication occurs.
- **AC-12 — Schema compatibility:** A saved workflow succeeds when source columns are reordered or extra unused columns are included. Missing required columns and duplicate normalized header names block processing; similar-but-unknown headers do not silently remap.
- **AC-13 — In-app correction:** An invalid source quantity such as `Twenty Four` is corrected to `24` in session; dependent output values and validations recalculate, original value remains inspectable, and the saved workflow is unchanged.
- **AC-14 — Source replacement:** Reuploading a fixed source file retains workflow rules and warns before destroying unsaved in-session corrections.
- **AC-15 — Safe partial export:** Of 500 candidate rows, 490 meet requirements and 10 are invalid. The app shows full counts, requires deliberate acknowledgement before exporting the 490, and reports 10 exclusions with row references. Warning-only rows may be included but warnings remain visible.
- **AC-16 — CSV specification:** Export default CSV in UTF-8 (no BOM), comma delimiter, header row, standard quoting, and CRLF rows. Tests verify delimiter/BOM/header choices, embedded commas/newlines/quotes, and column order.
- **AC-17 — Spreadsheet formula safety:** An untrusted formula in an input workbook is not executed. Formula-like text exported to `.xlsx` is stored as literal text. CSV formula-like text prompts explicit safe-versus-raw handling; CSV raw mode never silently changes bytes.
- **AC-18 — Repeatability:** Save a workflow, reopen it, and upload a compatible new file; the same approved recipes execute without remapping.
- **AC-19 — Workflow backup and compatibility:** Download and reimport a workflow on a different browser or local instance with equivalent results; unsupported future schema versions and malformed workflows produce safe clear errors. No sample row values are present in exported workflow JSON.
- **AC-20 — Local-only privacy:** Instrument browser requests during import, transformation, correction, export, and saved-workflow reuse; verify uploaded source contents and identifying record values are never sent to any network origin. Run this in CI from Slice 1.
- **AC-21 — Dataset size:** Process/export 10,000 rows without data loss and without an irrecoverably blocked UI on a documented reference environment.
- **AC-22 — Sample demonstration:** A visitor can run a ready-made synthetic customer-order conversion without using real customer files.
- **AC-23 — Value replacement (SHOULD):** Under an explicitly defined exact-match rule, `Pallet` becomes `PLT` and unmatched values follow the selected keep/flag policy.

## 11. Demonstration and release quality

Because the application is also a professional portfolio artifact, the first public release should include:

- A simple explanation of the operational problem and a short example of the solution.
- A **Try sample data** path using a fictional customer order export, destination import template, and working example configuration.
- Clear privacy messaging: processing stays in the browser; workflows are saved locally unless downloaded; no account is necessary.
- Discoverable but nonintrusive information about the open-source repository and future custom-integration/consulting inquiries.
- Automated tests for common transformations, invalid cases, workflow round trips, and large representative datasets.
- An explicit statement that support for a specific TMS's proprietary import rules is user-configured, not vendor-certified.

The launch standard is a tool that works and is worth demonstrating—not a defined number of visitors, signups, consulting leads, or revenue.

## 12. Suggested implementation sequence (not architecture)

Compound Engineering should refine dependencies, but **do not postpone the workflow object, source-row provenance, or exception data model until later**. Each slice should result in a working, demonstrated vertical path.

1. **Slice 1 — Reliable minimal conversion.** Declare a versioned recipe/workflow model and row/issue representation first. Provide synthetic golden fixture from day one; load CSV, configure simple copy/reorder, show preview, and export. Introduce local-only network tests and restrictive CSP at this point.
2. **Slice 2 — Target-ready transformations.** Add fixed values, split/combine, arithmetic with decimal semantics, explicit date reformat, CSV output settings, `.xlsx` one-sheet input/output, and associated fixtures.
3. **Slice 3 — Save and rerun.** Browser persistence, portable JSON backup/import, version guards, and repeat-run schema compatibility. The core recurring use case should work here.
4. **Slice 4 — Review and recover.** Configurable validation, valid/warning/invalid statuses, source-cell correction in-session, reupload, deliberate partial export, exception reporting, spreadsheet security checks.
5. **Slice 5 — Differentiation and launch polish.** Logistics-aware deterministic suggestions, accessible graphical polish, contextual guidance, portfolio/demo messaging, user documentation, and any SHOULD capabilities that fit without jeopardizing correctness.

Release an internal preview of earlier slices if useful; call the **full MVP complete only when all MUST requirements and acceptance scenarios pass**. If delivery time becomes a constraint, explicitly revise the PRD rather than silently omitting a MUST.

## 13. Future extensibility (guardrails, not features to build now)

- Keep the transformation engine independent of UI components and browser storage, accepting a declarative workflow plus parsed source rows and producing transformed rows and issues.
- Use a versioned workflow schema with explicit compatibility policy (FR-46); do not build speculative plugin APIs or executable user scripts now.
- Keep deterministic terminology-based suggestions separate from transformation execution. Optional future AI/Decisions API services might suggest mapping candidates, but **must not silently transmit source records** or bypass user choice.
- A future hosted/paid processing service would require separate permissions, disclosure, account/security arrangements, and appropriate commercial terms; none is needed for the free MVP.
- Leave conceptual room for relational lookups, multi-source joins, group-by/aggregation, integrations, and shared workflows, but avoid overbuilding abstractions before real requirements exist.

## 14. Decisions resolved in v0.2 and remaining decisions

### 14.1 Product decisions proposed as resolved

1. **Transformation composition:** One independent recipe per destination field; no output-to-output chains in MVP (FR-38).
2. **Record relationship:** One candidate output record per nonblank source data record; no grouping, consolidation, or expansion (FR-35).
3. **In-app corrections:** Correct session source cells and recalculate dependent outputs; no destination overrides (FR-23).
4. **Header matching:** First nonblank row as header; normalized name matching; reordered/extra unused columns allowed; missing/duplicate required columns block the run (FR-37, FR-39).
5. **Fixed destination values:** MUST. Simple exact value substitutions: SHOULD. External lookup tables: LATER.
6. **Date handling:** Explicit source-to-destination date format mapping is MUST; broader locale inference is LATER.
7. **Data precision:** Decimal-safe arithmetic; no unannounced rounding; explicit target precision/rounding where required.
8. **Exception semantics:** Valid/warning/invalid per row, workflow-level blocking errors, acknowledged partial exports (FR-44).
9. **Workflow versioning:** Version field from initial release; reject unsupported future versions; implement explicit migrations when supporting older versions (FR-46).
10. **CSV export:** Defined defaults and configurable delimiter/BOM/header settings (FR-45). CSV safety and exact TMS bytes require explicit handling when formula-like text occurs (FR-47).
11. **Whitespace:** No undisclosed auto-trimming; configured cleaning rules are visible (FR-12).
12. **Backup:** Browser storage is the convenience default; user is strongly encouraged to download a durable portable file for backup/share.

### 14.2 Items for CE planning or targeted product review

1. **Reference browser/device and measurable latency:** Select environment and thresholds during performance planning. The 10,000-row end-to-end behavior remains an MVP acceptance requirement.
2. **Date pattern UI and supported Excel formats:** Select parser/library and ensure fixture coverage. The supported date patterns in FR-41 are a minimum, not an automatic locale detector.
3. **Rounding UX:** Choose clear operator labels and supported explicit rounding modes consistent with FR-43.
4. **Workflow backup prompt UX:** Decide between nonblocking prompt/dialog on first save; backup action must stay clearly accessible.
5. **Open-source license/hosting/dependencies:** Select during repository setup, accounting for distribution and security.
6. **Initial domain synonym dictionary:** Define modest high-confidence logistics equivalents and negative examples; avoid overbroad automatic suggestions.
7. **Optional value replacement (SHOULD):** Implement when it does not delay reliable core mapping, or explicitly schedule for a follow-on release.
8. **Unsupported export encodings/import conventions:** Document which proprietary TMS formats require custom work instead of claiming universal compatibility.

**Product decisions should not be silently changed by Codex/CE.** If review uncovers a conflict (particularly between fidelity and CSV injection safeguards), surface the decision for product approval.

## 15. Handoff instructions for Compound Engineering

1. Run **document review** first. Challenge unclear acceptance criteria, unsafe assumptions, privacy claims, scope inflation, and incomplete operator journeys. Treat this PRD as a **draft**, not a command to implement everything immediately.
2. Review the resolved decisions in Section 14.1, flag remaining contradictions, and freeze the smallest viable release that meets the agreed MUST requirements.
3. Produce an **engineering plan** for the independent recipe model, file fidelity/export contracts, validation/issue model, preview and source-cell correction, workflow versioning/persistence, local execution, CI privacy assertions, and deployment.
4. Keep domain-aware suggestions deterministic in the MVP; avoid reliance on external model APIs.
5. Implement in verifiable vertical slices with golden-file tests and synthetic transportation-order fixtures. Keep source-data privacy tests running from the first slice.
6. Protect the primary product promise: an ordinary spreadsheet user can complete an accurate, repeatable order-file transformation without sending their customers' data to a server.

---

**PRD status:** Draft v0.2 for `ce-doc-review`. Substantive product requirements are proposed; CE should flag any remaining contradictions and plan implementation without silently changing product semantics.