# Independent keyboard focus synchronization race

The upload fix in `ec11fd4` passed the pending-Open regression in Chromium,
Firefox and WebKit in [run 38841347446](https://github.com/tamundrud/operations-data-cleaner/actions/runs/38841347446).
That run passed 176/177 browser cases and exposed a separate Chromium test race.

The first suggestions test rejected PO #, waited for its candidate to disappear,
then focused Consignee Accept and pressed Enter. Rejection restores focus to the
Purchase Order Reference output in requestAnimationFrame. Candidate disappearance
does not prove that focus restoration has finished. Its pending callback could
move focus between the test's next focus call and keyboard Enter.

The CI trace (artifact 12021573412, SHA256
`16e4eae856db080ea29d38923c05fd7f50e87ff0ada392ea8287fd42a219237b`)
shows Purchase Order Reference selected while Consignee remains suggested. Enter
therefore activated the output card, rather than the intended Accept button.

## Controlled verification

A temporary Playwright harness held the next requestAnimationFrame callback after
keyboard rejection. Releasing it between the following focus and Enter reproduced
the exact missing-Unlink failure. Waiting for Purchase Order Reference to receive
focus before moving to Accept passed the same controlled scenario. The harness
used synthetic headers and values and did not modify production code.

The committed fix adds that observable focus-state assertion to the existing test.
It retains keyboard activation and all acceptance assertions. No production code,
timeouts, or application focus behavior changed.

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `U2_CHROMIUM_PATH=/usr/bin/chromium npx playwright test tests/e2e/suggestions.spec.ts --project=chromium --repeat-each=3 --reporter=line,json`: 9/9 passed.
- Installed CE focused review plus independent local adversarial review: complete,
  no findings. Receipts are in `focus-review/`; no different-provider review is claimed.

The final exact-head three-browser CI result is recorded on PR #5 after pushing.
