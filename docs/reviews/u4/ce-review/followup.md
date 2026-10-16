# U4 review resolution

The original [review receipt](review.json) is retained unchanged. Its review target was the then-current staged/unstaged tree at HEAD `93ed147`, not the eventual final commit. This follow-up records the caller's fixes and verification; it does not rewrite the reviewers' original verdict.

Finding 1 (P2): **closed**. Both asynchronous handlers in `SavedWorkflows.tsx` invoke `currentProps.current.activate` after generation/selection/disabled checks. Replacement confirmation now reads the latest draft/source state. The independent validator confirmed the original defect; `../activation-race-red.json` shows its Chromium reproduction before the fix.

`workflow-portability.spec.ts` holds a JSON read, completes a new source upload/export, then releases the read and dismisses replacement. It verifies the newer source, configuration and downloaded CSV remain intact. `persistence.spec.ts` holds a saved read, edits the draft name, then releases the read and dismisses replacement; the name and stored definition remain intact. Both passed in Chromium, Firefox and WebKit during the final 69/69 matrix; the complete final matrix result is in [verification](../verification.md).

The follow-up accessibility run exposed lost focus after native dialog cancellation. A Save-button ref and dialog `onClose` handler restore focus. The keyboard/Axe/hostile-metadata test passes with this correction. No review finding remains deferred, and no product decision was changed. R10 and local implementation U3 are complete following this correction; hands-on operator acceptance remains outside automated qualification.

No second full review was run: the changes directly implement the validated finding and its related focus regression, with scoped production-browser verification. The nine-reviewer receipt's cross-model and native upgrade-test limitations remain applicable.
