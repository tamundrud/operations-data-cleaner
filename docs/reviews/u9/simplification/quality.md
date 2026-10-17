# U9 simplification — code quality

Scope: human-authored U9 integration changes against `81f74a2`, including `src/formats/xlsx.ts` and the new XLSX unit/browser tests. Read-only review using the installed `ce-simplify-code` quality persona. No source edits or changes to ZIP preflight, its tests, or existing review evidence.

Reviewed the approved U9 plan and preserved its worksheet selection, raw/display/type provenance, cached-formula semantics, calendar dates, template validation, and bounded unchanged-archive preflight decisions.

## Findings

1. **`tests/unit/excel-values.test.ts:6` — duplicated production metadata type.** The local `Excel` declaration repeats every field of the exported `SourceCell["excel"]` type in `src/engine/values.ts`. This can drift as metadata evolves. Import `SourceCell` alongside `SourceTable` and define `type Excel = NonNullable<SourceCell["excel"]>`. The alias resolves to the exact current structure; fixture values and assertions stay unchanged.

2. **`src/session/controller.ts:78` — repeated format derivation in the same success branch.** Both the policy callback and replacement workflow independently compute `active.file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv"`. Compute one local `format` after destructuring the candidate and use it in both places. This preserves the existing filename rule, callback order, and workflow semantics without introducing a helper or extra stored state.

3. **`src/ui/Workspace.tsx:335` — deeply nested status-message conditionals.** The render combines the outer `view` ternary, worksheet selection, and two delimiter comparisons inside one template literal. Derive the CSV delimiter label and source description using named local expressions before rendering, then interpolate the result. Preserve the exact existing status strings for this simplification pass; any worksheet wording correction belongs to a separately verified behavior change.

All findings are low severity maintainability improvements. No safety checks, metadata distinctions, archive guarantees, or accessibility affordances should be removed. The SheetJS stub/cache comment and date-epoch comments explain non-obvious constraints and should remain.

No tests were run by this read-only reviewer; final typecheck, lint, and behavior verification belong to the orchestrating simplification pass after any accepted edits.
