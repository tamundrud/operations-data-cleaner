# U8 explicit date formats

Started from fetched `origin/main` at `bad9233` (merged/approved U7), with clean status and no local-only commits. Dedicated branch: `feat/u8-explicit-date-formats`. `$ce-work` was verified at `$HOME/.agents/skills/ce-work/SKILL.md`; the installed definition and required references govern execution through the filesystem fallback. Native inline implementation covers the single U8 unit. The approved plan and PRD remain unchanged; the current user instruction authorizes this unit despite historical planning-only notices.

## Behavior and scope

Strict explicit source/output patterns: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY. Parsing uses Gregorian leap-year/calendar arithmetic and a plain year/month/day value, with an explicit presentation format; no Date object, locale inference or timezone conversion. Four-digit years 0001–9999 and padded month/day are required. Impossible dates, unsupported datetime text, whitespace without configured trimming, and mismatched formats fail. Empty optional dates pass; required blanks fail. A failed primary recipe remains invalid even for optional dates.

Date conversion follows copy, fixed text, split or combine, after explicit trim. Number/calculation settings and text maximum lengths are incompatible with date outputs. Original source text stays intact. Existing workflow version 1 date settings are enabled through shared semantic validation; unknown patterns/properties still fail strictly. Saves and portable JSON contain configuration only. Source compatibility, revision checks, stale replies, CSV formula decisions and the approved paired-card interface keep their existing paths. No Excel support, U9, merge or deployment is included.

## Evidence strategy

Existing workflow, numeric validation, constants, split/combine, session, persistence, privacy, performance and paired-card tests were inspected. Six new engine tests were run before production changes: all six failed because date execution/portable validation was unsupported. They then passed after implementation. A seventh regression rejects a trailing newline instead of accepting a regex prefix. Coverage checks all nine pattern pairs with literal CSV byte expectations, ambiguity, leap centuries, impossible dates, unsupported input, blank behavior, primary recipes, explicit trim, source/provenance and strict workflow compatibility.

Browser tests use the production build. Assertions check actual downloaded bytes, local reopen, reordered headers, portable reuse in fresh contexts with America/Los_Angeles and Pacific/Kiritimati timezones, mobile Axe/layout/focus, strict errors, optional/required blanks, first/replacement source choice, fixed dates and renewed formula acknowledgement. The existing privacy interception journey adds a distinctive source date, checks its converted output, and excludes both representations from stored configuration. A new 10,000-row journey compares every output byte and identifier.

Browser setup: Playwright download was denied with `403 Domain forbidden` by environment network policy. System Chromium is available through the repository's existing `U2_CHROMIUM_PATH=/usr/bin/chromium` override. Firefox/WebKit are not locally claimed. Existing three-browser GitHub CI remains unchanged. Cloud performance is smoke evidence, not reference-laptop/full-MVP qualification.

Validation results and CE receipts are appended after their runs complete. Screenshots contain synthetic data only; hands-on UX acceptance remains with the user.

## Completed validation

- `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`: passed after simplification. **166 unit tests / 17 files**. Node v24.19.0; npm 11.9.0; Linux cloud runner; system Chromium 154.0.8037.57.
- `full-chromium.txt`: **76 passed (3.3 minutes)**, entire production Chromium regression before the final fixed-date type cleanup/simplification.
- `fixed-date-red.txt`: extending the fixed-date browser scenario with a pre-existing maximum text length reproduced a disabled export; the inspected workflow error was “Maximum length requires a text field.” The fixed-value handler had overwritten central type cleanup. Cleanup is now owned once by the existing field-update path.
- `date-settings-green.txt`: **13 passed (41.6 seconds)** after that fix, covering date configuration and every constants regression. Fixed-date input now has the contextual label “Fixed date.”
- `tested-source.json` records hashes of executable/test/build inputs after simplification. Exact source checks and final scoped browser result are recorded below when complete.
- Screenshots: `date-workspace.png`, `date-settings-desktop.png` (1440 × 900), `date-settings-mobile.png` (390 × 844), and `date-errors.png`. Desktop/mobile settings screenshots were visually inspected; formats and context remain readable within the existing paired-card dialog. Automated Axe, focus and overflow checks pass.

## CE evidence

- `plan-review/`: installed ce-doc-review, four completed scoped document lenses, complete raw outcomes/source hashes, no material ambiguity; ce-plan intake reused the approved executable U8 plan.
- `simplification/`: three independent reuse/quality/efficiency reviews, five small improvements applied and one low-priority allocation suggestion deliberately skipped to preserve provenance isolation. Post-pass checks recorded above.
- Dedicated `ce-code-review` completed: `ce-review/review.json`, status `complete`, run `20261017-025947-2b668869`. Seven lenses returned zero findings; required merge/report stages completed and no finding required a validator batch. No justified residual findings or testing gaps remain. No different-family peer CLI was available; the dedicated review uses a local adversarial fallback and does not claim independent cross-family corroboration.

- `post-simplification.txt`: **28 passed (1.8 minutes)** on the final simplified application: dates, constants, calculations, production privacy and every performance check. The U8 10,000-row case passed with all CSV bytes compared against an independent expected result. Both fresh timezone contexts retained identical downloads.

## Final review and handoff

The completed full CE review covers correctness, AGENTS standards, testing, maintainability, security, workflow API compatibility and adversarial cases. The correctness reviewer independently exercised 2,519,748 calendar/pattern boundary combinations over years 0001–9999 with no failures. Complete artifacts and archive hashes are in `ce-review/`. The review finding follow-up consumed the receipt: none applied, none skipped, no fix batches and no justified residual work. The plan U8/KTD-04, AC-09 text-date scope, verification contract and scoped Definition of Done were rechecked against the final diff. Later MVP requirements remain deferred as planned.

The executable/test/build source hash manifest matched after all review work; only evidence documents/images changed while dedicated review ran. No dedicated review was skipped. A single focused U8 commit and draft PR are prepared for hands-on UX acceptance. No merge/deploy/U9 actions are part of this run. The GitHub connector is used for PR/CI access because the CLI token is unusable in this environment. Draft status suppresses automatic CE babysit handoff; CI is still checked as explicitly requested.
