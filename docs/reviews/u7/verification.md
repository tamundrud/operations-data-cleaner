# U7 implementation and validation

Base: latest fetched main `8f0432d` (approved/merged U6). Branch: `feat/u7-exact-calculations`. Pre-work checkout and local-only commit inventory were clean. `$ce-work` was verified at `$HOME/.agents/skills/ce-work/SKILL.md`; native invocation was unavailable, so the installed skill and its required disk references governed the work. Native inline execution implements only the single U7 unit. The approved executable plan was reused without product/plan edits.

## Delivered behavior

Exact decimal add/subtract/multiply/divide use strings and big.js, with a bounded integer-rational proof for exact division. Zero is a valid operand; missing inputs and zero divisors are explicit failures. Strict number interpretation never infers units, factors, locale, whitespace trimming, currency, grouping or exponents. Numeric source interpretation is opt-in; text identifiers remain text. Whole-number requirements inspect the exact value before rounding. Nonterminating division, excessive configured decimal scale and resource overflow are visible errors unless the applicable explicit rounding policy resolves them. Three rounding modes and their decimal places are shown in contextual column settings, with examples.

The paired-card interface, independent recipes, source/constant provenance, deterministic normalized-header compatibility, local-only processing, configuration-only persistence and revision/export safety remain on existing paths. Calculations and numeric settings use the already-declared version 1 grammar and shared semantic validator. Portable JSON and local saves retain meaning. No dates, Excel, U8, deployment or merge work is included. Screenshots and fixtures are synthetic. See ../../decisions/exact-decimals.md for bounds/dependency qualification.

## CE procedure evidence

- `plan-review/`: six completed document-review lenses, no findings/residual questions; ce-plan intake reused the supplied approved executable plan.
- `simplification/verification.md`: three completed independent reuse/quality/efficiency reviews; four unique behavior-preserving improvements applied.
- `ce-review/review.json`: completed full ce-code-review receipt (status complete), eight lenses and independent finding validation. Confirmed P2 finding 2 was fixed inline with red-first browser proof; both testing gaps were addressed. `review-followup/README.md` records resolution. No justified residual findings remain.
- No cross-family model route was installed (`claude`, `grok`, `cursor-agent`, `opencode` absent); local adversarial review provides that lens. No external-model corroboration is claimed.

## Verification evidence

Existing workflow, constants, split/combine, persistence, worker/session, export, privacy, performance and paired-card tests were inspected before implementation. New decimal proof started with a missing-module failure after locked dependencies were installed; integration proof then failed in three expected cases because calculations and numeric source validation were unsupported. These failures were observed before their corresponding production changes. All behavior changes have automated coverage; no no-test exception.

- `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`: passed after the review fix. 159 unit tests across 16 files. Tests assert exact results, division termination, signed rounding ties, strict numeric grammar, pre-round whole numbers, precision/resource errors, exact CSV bytes and portable settings.
- `final-full-chromium.txt`: final post-review production Chromium regression, 71 passed (2.4 minutes), including both source-selection regressions, all approved U2–U6 paths, arithmetic/privacy and 10,000-row checks.
- `full-chromium.txt`: complete production Chromium regression, 68 passed (2.2 minutes), including approved U2–U6 behaviors, context-wide privacy, persistence/races, full counts, and 10,000-row arithmetic. The subsequently added fourth U7 calculation test passed in `focused-calculations.txt` (4/4).
- `final-browser.txt`: post-simplification production Chromium calculations/privacy/performance, 12 passed (52.2 seconds). Includes all four U7 browser cases, renewed CSV safety decisions after precision edits, saved reopen/fresh-context portable reuse, mobile Axe/focus, strict errors, and arithmetic exports across all 10,000 rows.
- `review-followup/source-remap-red.txt`: both new numeric source-selection regressions failed with Number → Text before the fix. The first post-fix full run reached the final error-display assertions but needed to explicitly reopen the existing exception filter after re-evaluation; that test correction is recorded in `review-followup/initial-full-browser.txt`.
- `capture.mjs` / `capture.json`: production workspace at 1440/1024/390 pixels, calculation and rounding dialogs at 1440/390. No page errors or page/dialog horizontal overflow. Screenshots were visually inspected; UX acceptance remains with the user.
- `tested-source.json`: SHA-256 manifest of source/test/build inputs for reproducibility. No source records enter saved/portable configuration; numeric sentinel interception extends the existing production privacy journey.
- `npm audit --omit=dev --json`: zero production advisories when introducing pinned big.js 7.0.1 (MIT); distribution license retained. Production worker build succeeded.

Reference environment: Node 24.19.0, npm 11.9.0, Linux x86_64, system Chromium 154.0.8037.57. Playwright browser download returned network-policy `403 Domain forbidden`; local Firefox/WebKit runtimes are unavailable. Existing three-browser GitHub CI remains configured; its result is checked on the draft PR when available. Cloud timings are completeness/responsiveness smoke evidence, not reference-laptop or full-MVP qualification.

The PR remains draft for hands-on UX acceptance. No merge, deployment or U8 is authorized.

## GitHub CI follow-up

The first three-browser run on 930b0fe passed 212/213 cases, with one WebKit name-entry setup failure in the new save/reopen test. `ci-save-entry/README.md` records the observed empty-name state, trace artifact, test-only readiness correction, and 6/6 focused Chromium validation. Production behavior is unchanged; the following CI run verifies the corrected test on all browsers.
