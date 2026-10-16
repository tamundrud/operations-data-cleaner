# U5 implementation and validation

Base: latest fetched `main` at `8d0882a462639ed374b7cc1a6889cc918599e576` (approved U4). Dedicated branch: `feat/u5-confirmable-logistics-suggestions`. Pre-work tree and local-commit inventory were clean. Native `$ce-work` invocation was not cataloged, so the installed `$HOME/.agents/skills/ce-work/SKILL.md` and required phase references were read and executed. Only U5 is implemented; the approved executable U5 plan section supplied scope and verification. Fresh document-review evidence is in `plan-review/`; source hashes and approval/scope intake are retained there.

## Behavior and boundaries

Exact normalized headers and the two curated synonym pairs produce header-only candidates in source order. All ambiguous alternatives remain visible; Accept uses the existing copy-mapping path, Reject only dismisses a candidate in editor memory, and manual matching/settings remain available. Suggested, confirmed and unmatched states use text. Copy/constant recipes already present stay authoritative, including when saved source headers become incompatible. No field recipes are written by suggestion generation, and no candidate/rejection state enters the workflow codec or storage. No schema, engine, persistence adapter, dependency or network endpoint changed.

The tests cover Ship To/Consignee and PO #/Purchase Order Reference in both directions; exact normalization; negative billing/order/stop/shipment/unit cases; ambiguous alternatives; keyboard accept/reject/change/unlink; fixed-value authority; actual CSV bytes; and accepted recipe save/reopen/download/reimport. Unresolved recipes are rejected by existing click-time workflow validation. Unknown renamed saved source headers still block without suggesting a replacement. All examples are synthetic.

## Results

- `npm run typecheck` — passed, including the review fix.
- `npm run lint` — passed, including the review fix.
- `npm run test:unit` — **104 passed across 13 files**, including 11 suggestion cases (`unit-results.txt`).
- `npm run build` — passed after simplification.
- `U2_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --project=chromium --reporter=line,json` — **58 passed, 0 skipped/failures/flakes** (`chromium.json`). Includes U2–U4 fidelity, workflow persistence/races/portability, production privacy, accessibility, scheduler and 10,000-row performance/completeness regressions.
- Post-review `... playwright test tests/e2e/suggestions.spec.ts --project=chromium --reporter=line,json` — **3 passed**, including complete context-wide privacy interception across initial confirmation/rejection, reload/reuse and separate-context import (`review-fix-chromium.json`). One preceding attempt timed out during Axe in the otherwise unchanged keyboard case; that attempt's other two cases passed and an unchanged recheck passed all three.
- `U2_CHROMIUM_PATH=/usr/bin/chromium node docs/reviews/u5/capture.mjs` — captured the final production UI at 1440, 1024 and 390 pixels; no page overflow or page errors (`capture.json`). Visual inspection retained the existing paired-card workspace and contextual controls. Screenshots do not constitute the user's UX acceptance.
- `git diff --check` — passed.

Node 24.19.0; system Chromium 154.0.8037.57. Platform, production build assets and tested source hashes are in `tested-source.json`. These are cloud correctness/performance smoke checks, not reference-laptop or complete-MVP qualification.

## CE quality evidence and limitations

The installed `ce-doc-review` completed six fresh reviewer lenses with no blockers. `ce-simplify-code` ran independent reuse/quality/efficiency reads; two small improvements were applied and verified (`simplification.md`). Actual `ce-code-review mode:agent base:origin/main plan:...` self-sized focused and returned `status: complete`, run `20261016-013018-beac5bae`. Its one P2 privacy-test finding is closed with evidence in `review-followup.md`; no justified findings remain.

Firefox/WebKit were not runnable locally: downloading Playwright browsers is denied by the environment's `cdn.playwright.dev` policy, and privileged dependency installation is unavailable. The repository's existing three-browser CI configuration is retained. No local Firefox/WebKit pass or external-model review is claimed. GitHub CLI authentication also cannot query this environment; the authenticated GitHub connector is used for repository/PR metadata and creation.

The PR must stay draft for the user's hands-on UX acceptance. No merge, deployment, or U6 work is part of this change.
