# U5 test-first evidence

Execution engine: native, inline U5 implementation; existing U4 prerequisite verified at `8d0882a`. Clean pre-work tree; no pre-existing local commits beyond fetched `origin/main`. The existing executable U5 section was used rather than replanning approved product decisions. Fresh document review evidence is in `plan-review/`.

Before production writes:

- Added `tests/unit/suggestions.test.ts` and ran `npm run test:unit -- tests/unit/suggestions.test.ts`. It failed because `src/suggestions/matches` did not exist (expected missing-feature failure).
- Built the unchanged U4 application and ran the new `suggestions.spec.ts` with system Chromium. The first-time and ambiguous journeys failed at the expected missing `Accept Ship To for Consignee` button. Browser installation initially failed because the environment blocks `cdn.playwright.dev`; system Chromium was then selected using the repository's existing override.

After implementation, all 11 suggestion unit cases passed. The first two browser cases passed. The persistence test's initial Save-button expectation was corrected to U4's existing click-time validation contract: incomplete workflows reject Save/Download with an actionable configuration error. It now exercises the actual persistence boundary without changing U4 controls. All three corrected U5 browser journeys passed before simplification.

Existing tests inspected: paired-card mapping/accessibility, CSV conversion/constants, privacy, saved-workflow persistence/portability and workflow schema/roundtrip suites. The new behavior is covered through the pure header matcher and actual production UI, native storage and downloaded bytes. No test-only production hooks, new dependencies, data inference, schema extensions, or U6 work were introduced.

Final verification after the two behavior-preserving CE simplifications is recorded separately in `verification.md` and browser/unit result artifacts. Documentation/footer changes are checked through typecheck, lint, the production build and responsive browser screenshots.
