# Tests

Use Node 24 and `npm ci`, then run:

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

Playwright starts the production server automatically. `U2_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium` selects an installed system Chromium. Keep Firefox and WebKit enabled in CI; a missing local executable is not a browser pass.

Unit tests cover strict workflows, faithful copies, typed constants, explicit trim, validation, provenance, counts, safety and independent byte goldens for all twelve delimiter × BOM × header combinations. Browser tests inspect actual downloads, bidirectional paired-card mapping and reorder, fixed-value configuration, preview generations, formula acknowledgement renewal, cancellation/recovery, accessibility and full-data fidelity. Privacy interception includes unique file, output-header and constant-value sentinels, all network origins and diagnostics, plus empty browser storage. Performance checks retain the original budgets and inspect 10,000-row output; a separate U3 check verifies every fixed/trimmed cell in all 10,000 rows.

Use synthetic fixtures only. See `docs/reviews/u3/` for actual command results, browser limitations, screenshots and CE review evidence. The XLSX qualification harness is separate from the delivered CSV application.


U4 adds `workflow-roundtrip.test.ts`, `workflow-store.test.ts`, native IndexedDB journeys in `persistence.spec.ts` and separate-context/origin downloads in `workflow-portability.spec.ts`. Codec goldens retain exact text/decimal/blank/order/settings semantics. Native tests cover transaction abort after request success, stale replacement from a second tab, denial, corrupt records, and saved-snapshot acknowledgement while newer edits remain unsaved.

The existing privacy journey now distinguishes empty ad hoc workflow storage from explicit configuration-only records. Source filenames, rows and record IDs remain excluded; deliberately configured headers/constants may be saved, and are still prohibited from network/diagnostic egress. Every storage envelope is inspected, and portable JSON is compared with the stored codec output. The 10,000 × 20 test saves/reopens before its warm repeats and imports an actual backup into another fresh context, checking all downloaded bytes against independent generated source/output data.

Portability tests start a second copy of the existing static server with `ODC_PREVIEW_PORT=4174` and stop it after the file finishes. The production default remains 4173. Neither server receives user file content. Desktop/laptop and keyboard/accessibility evidence belongs under `docs/reviews/u4/`; screenshots alone do not establish operator usability approval.

U5 adds `suggestions.test.ts` for exact normalized matches, the two curated equivalence groups, negative identifiers/units, and deterministic ambiguous alternatives. `suggestions.spec.ts` covers keyboard accept/reject, deliberate manual changes, fixed-value authority, ambiguous candidate choice, production request interception, and accepted mapping save/reopen/portable reuse. Unresolved candidates cannot be saved as approved recipes; renamed saved source headers remain incompatible. See `docs/reviews/u5/` for actual results and screenshots.

U6 adds `split-combine.test.ts` and `address-recipes.spec.ts`: exact segment counts, explicit optional-empty positions, literal delimiters, configured trim, ordered source/literal components, retained empties, independent source provenance, malformed configuration/dependency rejection, and exact CSV downloads. Browser checks cover contextual settings, component reordering, mobile keyboard/Axe, local save/reopen and fresh-context portable reuse with reordered headers. Existing production privacy interception now exercises split/combine before saving and repeating, and the U6 performance case compares every byte of a 10,000-row result. Review evidence, test-first failure, screenshots, and environment limits are recorded in `docs/reviews/u6/`.

U8 adds strict calendar/date integration tests in `dates.test.ts` and graphical configuration, local/portable reuse, ambiguity and timezone checks in `dates.spec.ts`. Downloaded bytes are checked against literal expectations in UTC and fresh Los Angeles/Kiritimati browser contexts. The production privacy journey includes a date sentinel through transformation/save/reopen; the U8 performance journey checks every byte of 10,000 converted dates. Screenshots and CE evidence live in `docs/reviews/u8/`. Local system Chromium is smoke coverage; CI retains all three browser projects.

U12 adds `export-eligibility.test.ts` and `partial-export.spec.ts`, plus acknowledgement lifecycle coverage in `session.test.ts`. They verify mandatory permission, exact eligible CSV/XLSX contents (500 candidates → 490 eligible / 10 excluded), warning inclusion, every excluded source reference, pagination and keyboard/Axe access, change-triggered permission resets, worker revision rejection, zero-eligible/workflow-error blocking, 10,000-row completeness, and production-context privacy interception. Evidence and screenshots live in `docs/reviews/u12/`.
