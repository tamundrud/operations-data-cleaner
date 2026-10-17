## Institutional Learnings Search Results

Search covered both files in docs/solutions and found one directly relevant entry: docs/solutions/xlsx-qualification.md.

Known Pattern: Qualify Excel archives before flattening cells (best_practice, inferred). Preserve raw/display/type/format/epoch/formula-cache data. Check actual expansion, CRC, central/local consistency and dangerous XML ranges before SheetJS parses the unchanged archive. U1 reproduced an alternate worksheet target bypass at xl/custom.xml. File-size checks, declared lengths and watchdogs do not establish allocation bounds.

Current src/formats/xlsx.ts:48 invokes preserved preflight before workbook reads, and selected-sheet parsing retains metadata. No contradiction was observed. The integrated worker, privacy, ordinary workbook compatibility and 10,000-row pipeline need U9 evidence. Historical driver guidance favors base64/indexed decoding over a 25 MiB JS number array.
