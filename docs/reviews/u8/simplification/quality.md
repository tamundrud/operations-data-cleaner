# U8 simplification — code quality review

Scope: current human-authored code diff against `origin/main`, plus the complete new `src/engine/dates.ts`, `src/ui/DateSettings.tsx`, `tests/unit/dates.test.ts`, and `tests/e2e/dates.spec.ts`. Reviewed repository instructions and plan U8/KTD-04. Read-only inspection and structural searches; no source/test/index edits or checks that generate output files were performed.

## Findings

1. **`src/engine/dates.ts:20` — redundant month-index conditional.** The first two branches both select capture group 2; only `MM/DD/YYYY` selects group 1. Replace the nested expression with `Number(match[pattern === "MM/DD/YYYY" ? 1 : 2])`. This is equivalent for all three `DatePattern` members and preserves the regexes, full-match safeguard, calendar validation, and explicit parsing behavior.

2. **`src/ui/MappingRows.tsx:908` — fixed-value handler repeats type-transition cleanup.** The new date branch duplicates the `maxLength` removal already performed by `update` at lines 139–142; number cleanup is duplicated there too. Remove the handler's `maxLength` property and let `update` own this policy. For number/date transitions `update` already sets it to `undefined`; for text/blank transitions spreading the original field already preserves its value. The handler's analogous `trim` property at line 907 can also be removed: number cleanup is centralized in `update`, while all other selections preserve the existing value. Keep the central cleanup and its existing patch ordering.

3. **`src/ui/MappingRows.tsx:975` and `src/ui/MappingRows.tsx:1053` — helper copy now uses three nested conditional operators.** Both additions introduce a third decision inside JSX, making the fixed-value explanation and output explanation harder to scan. Move each explanation into a small, separately named helper with flat early returns, preserving the exact strings and precedence: fixed blank → fixed number → date → text; output date → number → trimmed text → untrimmed text. Keep these two concepts separate rather than creating a generic message-selection abstraction.

All findings are small maintainability improvements; none requires changing product behavior or expanding U8.

## Preserved constraints and exclusions

- Incomplete date draft values deliberately fail strict validation; the empty placeholder casts in `DateSettings` are not flagged as a request to change that behavior.
- Retain explicit source/target patterns, full-match strictness (including trailing-newline rejection), calendar arithmetic, optional/required blank behavior, and workflow version 1.
- Preserve the paired-card interface, independent recipe/provenance behavior, export acknowledgements, privacy checks, and CSV safety. No Excel/U9 work is proposed.
- Keep literal expected date strings/CSV bytes in tests independent of production formatting; the test pattern table is not flagged for replacement by the production constant.
- Structural search verified the new date exports/component have consumers. No unused exports, state duplication, compatibility-removal candidates, or unnecessary UI wrappers were established in this scope.
