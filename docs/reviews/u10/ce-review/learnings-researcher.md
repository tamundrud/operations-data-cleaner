## Institutional Learnings Search Results

### Search Context

- **Feature/Task**: Review U10 typed, value-only XLSX downloads while preserving U2–U9 privacy, workflow portability, validation and revision guarantees.
- **Keywords Used**: XLSX, Excel, export, fidelity, precision, calendar, formula, metadata, archive expansion, worker, privacy.
- **Files Scanned**: Both files in `docs/solutions/`; frontmatter search followed by broader content search identified one substantive learning.
- **Relevant Matches**: One.
- **Search Boundaries**: No root `CONCEPTS.md`, critical-patterns document or Compound Pack roots were present. No tests, browser, server, installation or project writes were performed.

### Relevant Learnings

#### 1. Qualify Excel archives before flattening cells

- **File**: `docs/solutions/xlsx-qualification.md`
- **Module**: XLSX import boundary and integrated qualification.
- **Problem Type**: `best_practice (inferred)`; this entry has no YAML frontmatter.
- **Relevance**: U10 adds serialization to the same worker that imports XLSX. Historical failures include metadata lost by flattening, decompression before worksheet limits, forged ZIP lengths, and malicious worksheet routing through `xl/custom.xml`. These are documented regression traps, not newly observed defects in this diff. The writer receives evaluated values; XLSX imports still pass through `parseXlsx`, whose preflight precedes SheetJS (`src/formats/xlsx.ts:48`). The new integrated hostile-workbook test exercises the existing hostile fixture corpus while retaining an eligible previous download (`tests/e2e/excel-output.spec.ts:220`).
- **Key Insight**: Preserve original cell metadata until interpretation, enforce actual archive expansion before parsing, and qualify the complete production path. A worker, declared lengths, row caps and watchdogs do not independently establish resource safety. The learning explicitly says U1 results are feasibility evidence and require integrated U9/U10/U13 qualification (`docs/solutions/xlsx-qualification.md:11`).
- **Historical Context**: The corpus entry has no date. Its linked decision records U1 on 2026-10-11 and subsequent U9/U10 updates. Those later sections extend the original feasibility account.

### Review Context and Known Patterns

The current implementation visibly follows the relevant boundaries. `serializeXlsx` creates explicit string/numeric cells from `Value` objects, preserves blank extent and supplies a separate SSF table (`src/formats/xlsx-export.ts:45`, `:97`, `:102`). Numeric precision and calendar conversion are deliberate (`:16`, `:37`). This supports a “Known Pattern” note about preserving interpretation provenance and constructing a fresh output boundary; the historical learning establishes no actionable violation here.

The updated decision adds two valuable concrete discoveries: literal `_xHHHH_` tokens require protection, and `book_new()` can inherit private source number formats through SheetJS global SSF state. The implementation and dedicated tests agree with those documented claims (`src/formats/xlsx-export.ts:56`, `:102`; `tests/unit/xlsx-export.test.ts:75`, `:175`). These discoveries are recorded in the decision rather than the learning corpus.

The historical warning against relying on library rereads is addressed by direct ZIP/XML assertions (`tests/unit/xlsx-export.test.ts:33`). New browser tests cover privacy, hostile imports, cancellation and complete 10,000 × 20 output semantics (`tests/e2e/excel-output.spec.ts:187`, `:220`, `:236`, `:299`). Their presence is verified by inspection; their execution results were not independently verified in this pass.

### Recommendations

- Retain the historical archive-routing, expansion and metadata regressions when changing either XLSX boundary.
- Have final validation assess the integrated tests; U1 feasibility results cannot certify U10 or reference-device release performance.
- Consider capturing token protection and global SSF isolation as durable corpus learnings after acceptance. Both have specific failure mechanisms and dedicated regression coverage.
- No actionable defect, pack-rule violation or concrete missing-test finding was established by this institutional-learning pass.
