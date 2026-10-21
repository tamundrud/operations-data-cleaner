# Issue 14 flow analysis and single-pass behavior trace

Planning evidence only. Existing behavior was read from U13 commit `93ec73403b26aeddb5044c80534d30cca871dc96`; no tests or application execution were performed. The plan is `docs/plans/2026-10-20-issue-14-acceptance-plan.md`.

## User Flows

1. A saved or imported workflow opens in repeat mode. Edit workflow exposes rules; Done editing returns to repeat mode without activation, save, baseline replacement, or new export permission. Invalid/in-flight rules remain subject to ordinary validation. Imported workflows have no stored baseline, so the activation capability must not depend on baseline presence.
2. The operator reviews root-cause exceptions. A source-related action opens the inspector, resolves the original row ID in the independently filtered full dataset, and focuses/highlights the implicated cell(s). A rule error opens/identifies the configured field setting instead. Full diagnostic disclosure and counts remain available.
3. The operator selects source exceptions or invalid-only rows and stages changes across pages. The source query does not move output-preview selection. Stage values live above cell components so unmounting cells cannot drop them. Apply validates and evaluates one candidate batch, promotes only matching success, and retains resolved records for confirmation.
4. The operator navigates source rows after apply. Recently resolved identities remain visible until an explicit filter/navigation change; Next unresolved searches the full relevant dataset. Explicit navigation may move focus; successful application does not force a scroll.
5. The operator chooses discard, End session, new conversion, sample, replacement source, or saved/imported workflow activation. Pending-loss confirmation protects destructive transitions; cancellation preserves all pending values. Failed/cancelled source imports preserve the old source, committed overlay and staged intent.
6. Processing is cancelled, crashes, times out, or returns a stale result. Recovery reimports the active original file with only accepted committed corrections, leaving unaccepted pending intent available. Download remains blocked until the active revision is valid and pending edits have been resolved.

## Gaps

No additional launch-blocking plan gaps found. R8–R10 and KTD2 already require failure-safe candidate promotion; R4–R6 and KTD3 already require full-dataset navigation, independent selection and resolved-row confirmation. R1/KTD4 preserve imported activation and unsaved rules. The broad loss requirement covers End session even though U3's example list does not name every control.

## Single-pass Existing Behavior Trace

### Session correction and recovery

- Trigger: `Session.correct(row, column, value, revert)` checks active/busy/worksheet/replacement/recoverable state, mutates the host correction overlay immediately, advances sequence/revision, and sends one correction request.
- Worker ownership: the worker checks row/column existence, mutates its own overlay immediately, reevaluates, and sends a view. A non-page response resets output/source selection to page zero.
- Response acceptance: Session compares request, dataset and revision to its current pending envelope. Stale responses are ignored. A matching view updates the visible state; no separate host correction-commit boundary exists in U13.
- Failure: worker error returns an error response; Session clears busy and candidate import state. Worker crashes/cancel/timeouts call `stop`, increment sequence, terminate the worker, clear view and transport, and mark the active file recoverable.
- Retry: `retry` reimports the active original file and sends the host correction overlay. Therefore the new implementation must not place unaccepted candidate corrections in that overlay. KTD2 addresses this.
- Activate: `activate` calls `end`, which stops processing and clears active file, overlays, replacement state and workflow, then installs the new workflow and invokes the UI callback. Pending loss must be decided before this boundary.

### Workspace unsaved state and scheduled configuration

- Rule edits increment `draftGeneration`, set `dirty`, clear partial acknowledgement and formula choice. After 250 ms, a generation-checked effect calls `Session.configure` with current recipe references, provided no operation blocks it.
- Session configure advances revision and sends a full rerun. `pendingGeneration` lets completion clear `dirty` only for the same UI generation. A failed/cancelled generation is retained as failed and export remains gated.
- Persisted unsaved state is distinct from dirty validation state: codec comparison against `baseline.json` detects unsaved configuration; imported workflows without baseline are unsaved drafts. Done editing should only change visibility.
- Saved/imported activation goes through `Workspace.confirmReplacement`, then `resetWorking` and `Session.activate`. `New conversion` uses the same confirmation. In U13, End session directly invokes reset without that confirmation; it must join the pending-loss guard under R9.
- Source upload/sample invoke Session import, whose accepted candidate view commits active source and source policy. Existing source corrections prompt replacement confirmation; pending edits must participate and survive failed/cancelled import.
- Export is gated in both Workspace and Session by current view, no workflow errors, eligible rows, acknowledgement, and formula choice where relevant. Pending edits need an additional gate in both layers. Read-only source pagination should preserve permissions; applying changes must revoke them.

## Questions

No product questions remain. Exact labels/control layout and helper names are implementation details already deferred in the plan.

## Recommended Next Steps

Carry the existing boundaries into tests: End session pending-loss cancellation, imported workflow editing exit, failed/cancelled batch recovery, and source/output query independence. No new mechanism beyond the plan is needed.
