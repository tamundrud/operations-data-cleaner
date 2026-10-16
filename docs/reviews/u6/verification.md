# U6 implementation and validation

Base: latest fetched main `8afed6641295b79e1822c7b6eb06541bb1d0a2f7` (approved U5). Branch: `feat/u6-strict-split-ordered-combine`. Pre-work tree and local-only commit inventory were clean. Native skill invocation was unavailable; the installed `$HOME/.agents/skills/ce-work/SKILL.md` and required references governed the work. Native inline execution implemented the single U6 unit. The approved executable plan was reused without product/plan edits.

## Behavior and scope

Strict literal-delimiter split requires an exact segment count and explicit selected index. Every split destination independently reads original source text; configured trimming is off by default. Empty optional positions retain their delimiters. Missing/extra positions or unapproved empty segments invalidate rows, with row/field/source references and corrective actions. Invalid results do not become partial output.

Ordered combination joins source/literal components exactly, including repeated sources, literal whitespace, empty components and separators. Existing required/maximum-length and explicit CSV raw/escape rules apply after transformation. Component and split source references participate in the same normalized-header compatibility and configuration-only codec used by local storage and portable JSON. Version 1's existing finite grammar is retained; unsupported calculations, dates, Excel and output dependencies still fail closed.

Contextual column settings extend the existing paired-card workspace. Trimming, segment count/number, optional positions, component order/type/text and separator are explicit controls. Source usage includes all combined sources. Count reduction removes obsolete optional positions with a visible announcement while keeping the chosen output segment explicit. U2–U5 matching, suggestions, order, persistence and revision-safe export remain on their existing paths. No dependency or network endpoint was added. All fixtures and screenshots are synthetic. No U7, merge or deployment work is included.

## CE evidence

- `plan-review/README.md`: six completed document-review lenses, no blocking findings. The existing U6 plan is executable.
- `simplification/`: three completed independent reuse/quality/efficiency passes, no worthwhile changes.
- `ce-review/review.json`: actual completed `ce-code-review mode:agent` receipt, full depth, run `20261016-053319-u6`, eight lenses plus independent finding validation. Its single confirmed P2 is closed in `review-followup/README.md`; no justified residual findings remain.
- External model corroboration was unavailable because no different-family CLI route was installed. Local adversarial review ran; no external-model review is claimed.

## Observed checks

- Typecheck, lint, production build and `git diff --check`: passed after the review fix.
- `npm run test:unit`: 113 passed across 14 files (`unit-results.txt`). New engine proof started with seven expected unsupported-capability failures before production edits (`test-first-red.txt`). The review regression also failed before its fix (`review-followup/count-red.txt`).
- Final focused production Chromium U6 run: four passed (`focused-chromium.json`). Covers exact source-to-download bytes, local save/reopen, fresh-context JSON reuse, reordered/missing headers, count/optional errors, literal ordering/add/remove, mobile keyboard/Axe and count reduction.
- Initial complete Chromium sweep: 62 passed, one new textarea-selector failure (`initial-chromium.json`). Explicit accessible labels fixed that failure; the final focused run also corrects the independent expected CSV golden to include standard quotes around trailing whitespace. Production CSV behavior was preserved.
- That complete sweep passed existing U2–U5 regressions, production context-wide privacy interception including both new recipes, all persistence/race/portability cases and 10,000-row checks. The U6 large-data test independently compares all 10,000 output rows and bytes, including empty trailing components.
- Final complete Chromium recheck is recorded separately when finished; GitHub CI is checked after draft PR creation.
- `capture.mjs` / `capture.json`: final production workspace at 1440/1024/390 pixels, split and combination dialogs at 1440/390. No page/dialog horizontal overflow or page errors. Screenshots were visually inspected; they do not constitute the user's hands-on UX acceptance.

Node 24.19.0 and system Chromium 154.0.8037.57. Local Firefox/WebKit executables are absent; the existing three-browser GitHub CI configuration is retained. Cloud timing is a completeness/responsiveness smoke check, not reference-laptop qualification or full-MVP acceptance. GitHub CLI auth is unavailable; the authenticated connector supplies PR/CI metadata.

The PR stays draft for hands-on UX acceptance. No merge or deployment is authorized.
