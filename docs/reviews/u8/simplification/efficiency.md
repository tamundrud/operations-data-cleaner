# U8 simplification review — efficiency

Reviewed the current human-authored tracked diff against `origin/main` and the four new date implementation/test files. Read the U8 and KTD-04 plan requirements and relevant evaluator/worker context. This was a static, read-only implementation review; no source or tests were changed and no tests or mutating checks were run.

## Findings

### E1 — Repeated retained copies of field-level date settings (low priority)

**Location:** `src/engine/recipes.ts:98` and `src/engine/recipes.ts:111`.

**Inefficiency:** Every source or constant provenance entry creates a fresh `{ ...f.date }` even though source/target formats are identical for that field throughout the evaluation. A copy recipe retains one such allocation per row; a combination repeats it for every component of every row. These objects remain reachable in the full `Run`, rather than being temporary parse allocations. For example, the new 10,000-row single-date case retains 10,000 equivalent settings objects. This is bounded by the dataset/recipe limits, but needlessly increases memory and garbage collection work when settings trigger full reevaluation.

**Concrete fix:** Snapshot each date field's settings once before entering the row loop, then reference that immutable evaluation-owned snapshot from that field's provenance entries. Preserve the per-entry `date` property and its exact source/target values; do not reference the mutable caller-owned workflow settings directly. There are no provenance date mutations in the reviewed evaluator or worker paths. This keeps provenance and workflow v1 behavior while avoiding repeated equivalent nested objects. No measured latency or memory regression is claimed.

### E2 — Month-length table allocated for every parsed date (low priority)

**Location:** `src/engine/dates.ts:27`.

**Inefficiency:** Every successfully pattern-matched date allocates a 12-element array to answer one month-length lookup. Parsing is inside the full row/field evaluation loop, so this adds one short-lived array for each date candidate on every run.

**Concrete fix:** Move a common-year month-length tuple to module scope and compute the February override with `month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1]`. Retain all current range checks, exact pattern matching, years 0001–9999, leap rules, and timezone-free calendar arithmetic. This is an allocation reduction, not a demonstrated performance blocker.

## Other reviewed categories

No additional actionable findings in redundant I/O/API calls, missed concurrency, startup/render blocking work, recurring no-op reducer/event updates, existence prechecks, cleanup/listener leaks, or overly broad reads. The new parser is synchronous and bounded by fixed-width patterns; adding async/concurrency infrastructure would not simplify this path. The added date settings controls follow the existing field-update flow and introduce no polling or effects. Existing evaluator/UI work outside the U8 changes was not treated as a new finding.

The repeated `displayValue(value)` calls around date parsing are simple string access for the permitted primary text/blank values, so they do not justify a separate performance finding. Test timezone contexts are closed with `finally`; their sequential execution bounds simultaneous browser resources. Explicit format selection, strict parsing, paired-card behavior, privacy/export safety, workflow v1, and deferred Excel/U9 scope require no changes for these suggestions.
