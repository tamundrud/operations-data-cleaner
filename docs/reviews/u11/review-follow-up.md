# U11 review follow-up

Installed workflow: ce-work → ce-simplify-code → ce-code-review → ce-commit-push-pr.
CE review receipt: [code-review/review.json](code-review/review.json).
Run: 20261018-205605-u11; status complete; verdict Ready with fixes against the preserved review snapshot.

Nine independent lenses completed: correctness, project standards, testing, maintainability, security, performance, reliability, adversarial, and frontend races. No alternate-provider CLI was installed, so the sanctioned local adversarial fallback ran. No external-model review is claimed.

## Confirmed findings

- **#1, P2 — Full counts during incomplete mapping. Applied inline.** Incremental correction now always retains the original dataset's candidate count when workflow issues prevent row evaluation. A two-row unfinished-mapping regression failed with one candidate before the fix and passed afterward.
- **#2, P2 — Missing trailing CSV cells. Applied inline.** The overlay iterates source columns and treats an absent original cell as blank. The source inspector exposes correction/revert for those cells. The regression failed with blank instead of corrected text before the fix; unit and browser checks now cover correction/revert without changing original cell arrays.

The follow-up is caller-owned; the original review receipt is retained unchanged and does not claim to include these fixes. No justified actionable finding remains unapplied.

## Verification gaps closed

- A same-worker older correction reply cannot finish a newer rule evaluation.
- The actual production worker rejects an older correction request after a newer rule revision, preserving current values and revision.
- Correcting a filtered exception targets its matching source record; remaining exceptions retain their identities.
- A browser test waits for the replacement to reach the real parsing worker, cancels it, retries the prior file, and verifies corrected downloaded bytes, original provenance, candidate counts and corrected-row counts.

## Existing browser-test adjustments

The source-table whitespace assertion now checks the value span because a cell also contains correction controls. Its exact whitespace expectation remains unchanged.

The installed Chromium suppresses the eleventh rapid XLSX download. A minimal sample-flow reproduction produced downloads 1–10 and 12, with 11 absent; pacing before 11 produced all twelve. The hostile-workbook test paces each ten-download burst outside parsing measurements. All fixture rejection and independently inspected workbook assertions remain in place.

Final commands, results, timing and browser limitations are recorded in [verification.md](verification.md).
