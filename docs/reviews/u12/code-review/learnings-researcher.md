Institutional learnings search: scanned both files in `docs/solutions`; one relevant historical learning. No `CONCEPTS.md` or critical-patterns document found. No packs were configured.

**Known Pattern — Excel resource and fidelity boundaries**

Source: `docs/solutions/xlsx-qualification.md` (“Qualify Excel archives before flattening cells”; no frontmatter or date; problem type: resource/fidelity qualification, inferred).

The historical investigation found that metadata flattening loses fidelity and that resource checks performed after decompression cannot prevent allocations already made. Declared sizes, file-size checks, and worker watchdogs do not replace actual bounded processing. Its qualification results are explicitly feasibility evidence, with production compatibility and full 10,000-row processing requiring separate qualification.

Relevance to this diff is adjacent: U12 changes the XLSX writer’s row population from all candidates to eligible rows. The changed implementation still applies Excel row/cell limits to that eligible population (`src/formats/xlsx-export.ts:71–75`), retains its serialization budget, and processes each eligible row through the existing fidelity checks (`src/formats/xlsx-export.ts:95`). Filtering invalid rows should not bypass those checks for warning-bearing eligible rows. Preserve actionable rejection of unrepresentable values and complete output rather than silent truncation.

No directly observed defect follows from this historical learning. The documented ZIP decompression failures concern import, which this U12 diff does not change; do not report those historical failures as current export defects or expand the review into U13 qualification.