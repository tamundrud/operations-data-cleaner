## Institutional Learnings Search Results

### Search Context

- **Feature/Task**: Plan issue #14's focused U13 exception-review, source-inspector, and staged session-correction fixes while preserving privacy, fidelity, workflow compatibility, and existing behavior.
- **Keywords Used**: correction, session, worker, source, privacy, fidelity, exception, qualification, regression, browser; searched titles/tags/problem types first, then broader content because fewer than three candidates matched.
- **Files Scanned**: Two markdown files under the only resolved search root, `docs/solutions/`; one applicable learning. No `CONCEPTS.md`, Compound Packs, or `patterns/critical-patterns.md` exists in this checkout.
- **Relevant Matches**: One. `README.md` is a corpus-description stub, not a substantive learning.

### Relevant Learnings

#### 1. Qualify Excel archives before flattening cells

- **File**: `docs/solutions/xlsx-qualification.md`
- **Module**: Excel import and output provenance.
- **Problem Type**: `tooling_decision` / `security_issue` (inferred; the document has no YAML frontmatter).
- **Relevance**: The correction inspector must continue exposing original cell type/value/display/format/epoch/formula-cache evidence. A source-only correction must not flatten away this evidence or copy it into output workbooks. UI grouping must retain the original diagnostics and source/worksheet references.
- **Key Insight**: Preserve metadata at boundaries and verify real bytes through the integrated worker. A safety or resource claim based only on a row cap, watchdog, visual snapshot, or library reread misses demonstrated failures. Requalify the complete pipeline when changing its source/correction protocol. The learning is rooted in U1; its own text expressly says U9/U10/U13 need integrated qualification, so it is not evidence that issue #14 is already verified.
- **Current-code cross-check**: `src/engine/values.ts` models `SourceCell.original`, distinct raw/display strings, Excel metadata, and worksheet provenance. `src/session/correction-overlay.ts` creates literal replacements while retaining `original: cell`. `src/ui/ExcelCellDetails.tsx` exposes original metadata. The current worker derives source rows from the output-selected page, confirming the independent inspector is a new protocol change rather than a preexisting capability.

### Recommendations

- Preserve the established source-cell representation and literal overlay model; stage pending replacements separately from committed overlays so UI edits cannot mutate original source or exported workflow content.
- Test correction and exception navigation using real CSV/XLSX import paths, worksheet/record/line identities, leading-zero identifiers, original metadata, exact download bytes, and browser request interception. Keep existing archive/security regression suites unchanged and passing.
- Do not treat U1's feasibility timings or metadata tests as current release evidence. Keep issue #14's own browser matrix, privacy evidence, screenshots, and integrated regression results separate and reproducible.
- No prior learning directly specifies staged multi-page correction transactions, independent source pagination, or root-cause grouping. Those decisions must be grounded in current code and issue #14 rather than inferred from the Excel qualification note.
