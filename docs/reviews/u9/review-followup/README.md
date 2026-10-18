# U9 CE review follow-up

The [completed CE receipt](../ce-review/review.json), run `u9-integration-20261017`, has status `complete` and historical verdict “Ready with fixes.” Ten reviewers and a separate validator completed the full integration review. No different-family CLI was available; the sanctioned local adversarial fallback ran without external egress. The initial usage-limited dispatcher left only a scope/select stage log; recovery resumed that same run. The receipt and reviewed diff remain unchanged as historical evidence; the exact diff is gzip-compressed in `ce-review/full.diff.gz` with its decompressed SHA-256 recorded alongside. Console logs have trailing whitespace normalized.

All four validated findings were applied in the calling implementation context:

1. **Manual replacement worksheet provenance (P2):** a fresh manual replacement now discovers its sheets, even when a previous sheet name matches. The controller inherits internal worksheet settings only for initial activated-workflow import; repeat-workflow UI explicitly supplies its configured worksheet. Explicit selection and retry still name their sheet. Saved/portable workflow behavior remains covered.
2. **Independent template/source choice (P2):** each source or template submission clears the UI's previous choice. The picker stays unselected with Import disabled until the user chooses a sheet. Saved-workflow reuse is handled through explicit session settings, not leftover picker state.
3. **Selected-sheet failure coverage (P2):** the real-browser regression selects a duplicate-header worksheet, observes the parser error, byte-checks the previous export, and then successfully imports a renamed worksheet. This supplies stronger actual-worker evidence for the transition than adding another mocked-transport assertion. It also verifies same-name and missing-name manual replacements.
4. **Excel status copy (P3):** source-specific status is derived separately; worksheets are no longer described as detected delimiters. CSV status wording is retained.

Two strengthened tests failed before production changes: the template inherited `Synthetic` rather than an empty choice, and the manual replacement bypassed the chooser entirely. [Red evidence](worksheet-red.txt). After the fixes, both pass, including exact retained export bytes, successful subsequent import and saved/portable reuse: [green evidence](worksheet-green.txt). The comprehensive final checks are recorded in [verification](../verification.md).

All four findings are closed; no justified review findings remain unapplied. Preflight source, tests and its existing CE evidence at `81f74a2` were not modified. No second full CE review was used to overwrite the original receipt.
