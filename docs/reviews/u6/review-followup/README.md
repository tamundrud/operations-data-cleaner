# CE review follow-up

The CE correctness/adversarial finding #1 was independently reproduced before its fix: mark segment 4 optional, reduce expected count to 3, and the hidden fourth optional position leaves a workflow-level split-index error. `count-red.txt` and `count-red-context.md` retain the observed failing browser proof.

Applied inline in `TextRecipeSettings.tsx`: for a valid entered count, remove optional-empty indices that are no longer positions in the split; announce that removal in a live status. Temporarily incomplete/invalid count inputs do not prune configuration. The selected output segment is kept unchanged and visible for deliberate adjustment. Automatic clamping was rejected because it would silently change which source segment supplies an output. `MappingRows.tsx` keys the contextual settings by recipe kind so switching modes resets this local notice.

The regression checks the announcement, successful exact downloaded data and portable JSON without the removed optional position. The small testing gaps were closed in existing U6 tests: split-created formula text requires explicit raw/escape choice and has independently asserted bytes; the mobile component journey adds, moves and removes a literal and checks the minimum two-component constraint. The initial formula-test attempt used the wrong test option string (`escaped`); it was corrected to the existing public `escape` contract without changing production behavior.

Final typecheck/lint/build and 113 unit tests passed. Final browser results are recorded in the parent verification report. No justified review finding remains unresolved. No second full review was launched merely to re-apply this finding; the completed CE receipt is preserved with the original reviewed diff.
