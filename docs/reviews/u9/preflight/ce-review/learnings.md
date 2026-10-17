## Institutional Learnings Search Results

### Search Context
- **Feature/Task**: Review the staged narrow U1-to-production bounded ZIP preflight adaptation and cancellation, preserving the archive and validating all members before future parser integration.
- **Keywords Used**: XLSX, ZIP, qualification, archive, bounded, decompression, cancellation, CRC, relationship routing.
- **Files Scanned**: Both files in the complete `docs/solutions/` corpus; one relevant learning. No CONCEPTS.md, critical-patterns document, or Compound Packs present. Frontmatter search found no candidates; the required broader content fallback found the unfrontmattered learning.
- **Relevant Matches**: 1 learning, supplemented by its linked feasibility decision, harness README, recorded guarded/baseline evidence, and relevant current code.

### Relevant Learnings

#### 1. Qualify Excel archives before flattening cells
- **File**: docs/solutions/xlsx-qualification.md
- **Module**: XLSX import boundary
- **Problem Type**: security/resource-protection architecture pattern (inferred; no frontmatter)
- **Relevance**: Direct source learning for this adaptation. The historical concerns are represented in the new guard; no contradiction supported by this learning review was established. `src/formats/archive-budget.ts:278` checks `if (metrics.actualBytes > budget || actual > e.expanded)` before retaining chunks at line 281; line 318 verifies expanded length and CRC. This addresses the documented failure of declared-size-only checks and direct SheetJS inflation. It does not establish a process-memory ceiling.
- **Key Insight**: Validate the entire unchanged archive before SheetJS, including unselected members. Native deflate streaming with small input slices was qualified; whole-member fflate callback checks observed an already allocated 8 MiB output and are not a substitute. The current implementation uses 1 KiB input at `src/formats/archive-budget.ts:289` and native decompression at line 301; fflate is added only under development dependencies, consistent with independent fixture generation.

The most relevant prior regression is relationship-selected worksheet routing: the U1 review demonstrated an unsafe range at `xl/custom.xml` passing a filename-prefix check. Carry the all-XML inspection and package-routing checks forward together. Current code scans all XML `ref`/`sqref` attributes (`src/formats/archive-budget.ts:82`) and constrains XML content types/important relationship targets (lines 57–78). The staged tests inherit both alternate-worksheet-range and alternate-binary-worksheet hostile fixtures through `hostile()`; these are known-pattern regression coverage, not new defects established here.

The learning also separates feasibility from production readiness. The linked decision is dated 2026-10-11 and recorded reports are dated 2026-10-12. Historical browser-worker results do not qualify this newly adapted module or the eventual integrated application. The supplied intent correctly excludes XLSX uploads, reader/UI integration, integrated qualification, and U9 completion. Ordinary Excel/LibreOffice compatibility, worker privacy/error behavior, supported-browser capability failures, resource-boundary stress, and the complete 10,000-row pipeline remain later qualification obligations. Their absence from this guard-only diff is not a review finding.

### Recommendations
- Preserve the known hostile cases when adapting or tightening the guard: forged-small lengths, CRC corruption, duplicate/conflicting paths, alternate XML/binary routing, hyperlink ranges, and oversized cell references/format codes.
- Before enabling XLSX, run the same boundary regressions against the production worker and assert rejection before parser invocation; retain the unchanged original archive for the eventual reader.
- Keep actual expanded-byte metrics distinct from heap/RSS guarantees. XML byte buffers, decoded strings, and eventual reader objects can coexist; U1 explicitly does not claim a 100 MiB process cap.

No actionable defect or pack-rule violation was established by this institutional-learning pass. No project files were modified or tests rerun.
