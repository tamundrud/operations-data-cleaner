# U5 CI synchronization correction

## Debug Summary

**Problem:** [Actions run 38836497240](https://github.com/tamundrud/operations-data-cleaner/actions/runs/38836497240) passed 173 browser cases and failed the Chromium suggestion persistence journey. The failure was `.workspace` absent in `upload()` after the saved-workflow Open click. Artifact `csv-browser-evidence` ID 12019936578 contains the original trace; the user's trace inspection and retrieved job log identify `suggestions.spec.ts:93` and `helpers.ts:9` at original head `2889d7a0fc2665a02c06657914c116424a5a8909`.

**Root Cause:** `SavedWorkflows.tsx:96–107` sets pending Open before awaiting IndexedDB, activates the selected workflow, then releases pending state. `Workspace.tsx:269–280` disables source upload during Open and ignores its change event while pending. `suggestions.spec.ts` immediately called the shared upload helper after Open. The original helper transferred files with Playwright `setInputFiles()` before asserting enabled state. That API can transfer to a disabled input; it bypassed the intended UI ordering, so the application correctly ignored the file. The helper then incorrectly waited for a workspace that no accepted upload could create. Existing U4 native-chooser coverage already protects application behavior; its file chooser correctly waits for actionability and therefore did not exercise this helper misuse.

**Recommended Tests:** Retain the native chooser regression and parameterize it to exercise the shared upload helper during a controlled pending native IndexedDB read. Verify the activated workflow, actual independently expected CSV bytes, and unchanged stored definition. The U5 journey must wait for the named repeat-workflow view before uploading; the shared helper must assert enabled state before transferring files.

**Fix:** The helper now waits for `toBeEnabled()` before `setInputFiles()`, while retaining its post-upload readiness checks. U5 saved reuse explicitly waits for the repeat workflow named Synthetic U5. No production files, workflow schema, storage implementation, dependency, CI configuration or timeout changed.

**Prevention:** The existing native pending-Open fixture is reused for a second upload-helper case, with the held read released after 250 ms to model storage latency. This is controlled read latency for reproducing the race, not a readiness wait or an increased timeout in the fix. The test still asserts real application state and CSV bytes, with all existing protections retained.

**Evidence:** Before changing the helper, the new case failed with the same absent-workspace assertion (`red.json`); changing only the helper's precondition made it pass (`green.json`). After adding the explicit U5 activation assertion, the affected persistence/suggestion files passed all 14 Chromium cases (`affected-chromium.json`). Typecheck, lint, 104 unit tests and the production build passed. Existing production asset hashes stayed identical. The raw local red trace remains in the session at `/tmp/u5-open-red-trace.zip`; no real data was used.

**Pre-fix scope:** Clean tree on `feat/u5-confirmable-logistics-suggestions`, HEAD `2889d7a0fc2665a02c06657914c116424a5a8909`, matching draft PR 5. No pre-existing edits or unoffered commits. Fix-owned files are `tests/e2e/helpers.ts`, `tests/e2e/persistence.spec.ts`, `tests/e2e/suggestions.spec.ts`, and this fix's review/verification artifacts. Prior U5 feature evidence remains historical.

**Confidence:** High: original CI symptom reproduced under a delayed real storage read, then corrected without application changes.

## Post-Fix Quality

**Scope:** `base:2889d7a0fc2665a02c06657914c116424a5a8909`; fix-owned files only.

**Simplify:** Separate simplification skipped: fewer than 30 substantive changed code lines after excluding indentation required by the existing fixture's parameterization; no new abstraction or production implementation change. Self-review retains one shared locator and reuses existing native storage/read/export assertions.

**Review:** Actual installed `ce-code-review` completed with focused correctness plus an independent local adversarial read, run `20261016-023145-b776a3b2`, `status: complete`, zero findings. The receipt is retained under `ce-review/`. The original reviewed diff is archived losslessly as `full.diff.gz`. No different-provider route was installed; no external-model review is claimed.

**Residuals:** No review findings remain. CI is verified after the push and recorded in the PR update; no product or UX acceptance is implied by the automated checks.

**Three-browser verification:** The complete Chromium/Firefox/WebKit suite runs in GitHub Actions using the existing unmodified workflow. Local browser downloads are forbidden by this workspace's network policy, so no local Firefox/WebKit pass is claimed. CI must pass on the pushed fix before completion.
