# U2 approved paired-card matching implementation

Authorized October 14, 2026 for existing draft PR #2. Design approval covers layout and interactions; implemented U2 acceptance stays pending user hands-on review. No U3, merge or deployment.

## Design source and scope

[Approved specification](../design/u2/paired-cards/SPECIFICATION.md), [interactive prototype](../design/u2/paired-cards/prototype.html), and committed prototype evidence are present at `f253df4`. Supersedes the connector-line proposal and October 13 row-form presentation. The user’s current instruction resolves their outdated approval status. Preserve the prototype’s matched-slot reorder rule; matching, rematching, unlinking and source search never reorder the schema.

## Implementation

1. Replace MappingRows presentation with paired cards in a bounded Matched section above reusable searchable sources and unmatched outputs. Two source samples remain faithful text. Derive pairs from `fields` recipes; persist no second mapping/order model.
2. Match/replace by dragging source onto output or output onto source and by keyboard/click counterpart selection. Accept only in-app drag state. Reuse sources, announce actions and restore focus after grouping/unlink/removal. Keep settings in a native modal dialog, with source select, name, validation and full-schema move/remove. Add/template/bulk management is secondary. Template confirmation and failed replacement recovery stay intact.
3. Reorder whole pairs via grip drag or Alt+Up/Down; permute occupied matched slots only. All-output order dialog also includes unmatched fields. Preserve field IDs and recipes.
4. Reuse Workspace’s debounce/generation scheduler, session, schema, engine, validation, provenance, privacy, formula handling and byte exporter. Adjust styling to the approved reference, without new recipes or speculative polish.

## Verification contract

Run typecheck, lint, all unit tests, build and production browser suites. Adapt obsolete UI selectors while preserving byte/data assertions. Test both drag directions, replacement, source reuse/counts, grouping/unlink, selected/target states, pair drag and keyboard reorder with unmatched slots, full-schema movement, contextual management, focus/status, template order, automatic debounce/in-flight edits/cancel/recovery and stale export gating. Retain request interception and 10,000-row trials. Attempt configured Chromium, Firefox and WebKit; report actual failures separately.

Capture/inspect implemented sample and 25-source/30-output screenshots at 1440px and 1024px; compare with committed prototype. Archive results and limitations in `docs/reviews/u2-paired-cards/`. Run shipping quality/simplification and mandatory `ce-code-review mode:agent base:f253df4 plan:docs/plans/2026-10-14-u2-paired-card-matching.md`, using design, plan and PRD criteria. Collect prescribed reviewers and finish leaves, fix verified findings, rerun affected verification and record exact incomplete steps if capabilities fail. Update draft PR #2 with evidence. No old review receipt certifies this change.

## Completion gate

Required behavior and checks pass, screenshot evidence exists, CE review completion/limitations are accurately recorded, and draft PR #2 is updated. Hands-on U2 UX acceptance remains pending even when engineering work is complete.
