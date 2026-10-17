# U8 code reuse review

Reviewed the current human-authored diff against `origin/main` at HEAD `bad9233`, including the full new date engine, date settings, unit tests and browser tests. Consulted `AGENTS.md`, plan U8/KTD-04, existing workflow validation/codec, numeric and text settings, value display, CSV serialization and browser helpers. Read-only inspection; no source/test/index edits or checks were run.

## Finding

- **Low — `src/engine/values.ts:6`: reuse `CalendarDate` from `src/engine/dates.ts:7`.** The date arm of `Value` repeats the existing `year: number; month: number; day: number` contract. Import `CalendarDate` as a type and express that arm as `({ kind: "date"; format: DatePattern } & CalendarDate)`. This keeps the parser result, formatter input and stored date value tied to the same existing calendar shape without changing runtime output, errors, ordering, provenance or serialization. This is optional type-level cleanup.

## Other reuse checks

No additional behavior-equivalent utility, built-in, or verified downstream guarantee warrants replacement in the U8 changes. `DATE_PATTERNS` is already shared by the schema and date UI, while `displayValue` already delegates date output to `formatDate`. Existing recipe evaluation, validation, provenance and workflow codec paths are reused.

Keep calendar arithmetic and exact full-input validation: JavaScript `Date`/locale parsing would alter strictness or timezone behavior, and the extra full-match check protects against the regex `$` final-newline behavior. Keep the incomplete UI draft formats and strict schema boundary. Keep independent literal expected formats/bytes in tests rather than deriving expectations with production formatting helpers. No Excel/U9 expansion is suggested.
