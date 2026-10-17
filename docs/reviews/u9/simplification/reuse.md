# U9 simplification: code reuse review

Scope: integration changes relative to `81f74a2`, including new XLSX parser and unit/browser tests. Read-only review of implementation; ZIP preflight and its existing evidence were excluded from changes. Reviewed the approved U9 plan and searched existing engine, format, session, and test helpers for equivalent behavior.

## Findings

- **Low — `tests/unit/excel-values.test.ts:6`: duplicated Excel metadata type.** The local `Excel` declaration reproduces `SourceCell["excel"]`, including the calendar-date shape. Import the existing exported `SourceCell` type from `src/engine/values.ts` and use `type Excel = NonNullable<SourceCell["excel"]>`. This preserves every runtime fixture and assertion while keeping fixture typing aligned with the production metadata contract.

No additional behavior-equivalent reuse opportunities were identified. The parser already reuses `normalizeHeader`, the qualified `preflight`, SheetJS display/date primitives, and the independent U1 workbook fixtures. Browser tests already reuse mapping, calculation, settings, CSV upload, and download helpers. CSV and XLSX parsing have different row/provenance and validation semantics; sharing their loops would require a new abstraction rather than reuse of an existing equivalent utility. No downstream guarantee was sufficiently broad to remove an input check while preserving the documented behavior.

No tests were run for this read-only review. No implementation or preflight evidence was changed.
