# U2 matching board — design proposal

> Historical proposal. The latest paired-card design, complete specification, screenshots and interaction recording are in [paired-cards/README.md](paired-cards/README.md). Its automatic-preview direction supersedes the manual Update Preview proposal below. Design approval and the U2 UX checkpoint remain pending.

Date: 2026-10-13. Status: **proposed for user review**. U2 UX checkpoint: **open**. U3: **not started**.

This is an isolated synthetic mockup and a proposed UX contract. It does not amend the authoritative PRD/plan, change application UI or transformation code, or establish operator usability acceptance.

## Review the design

- [Interactive mockup](matching-board.html): open directly in a browser. No build or dependencies needed.
- [Desktop layout](matching-board-desktop.png).
- [Later recipe illustration](later-recipes.png).

The initial state deliberately leaves Delivery Notes unmapped. Drag Notes to it, or select Notes and activate **Match here**. Select **Update preview** to see the sample output. Use **Edit column** to rename, choose a different source, or move/remove an output. **Unlink** removes the match without deleting the output. **Import template** demonstrates an explicitly confirmed replacement using a bundled synthetic template; it does not read a user file. **See later recipe design** opens a separately labelled future-state illustration.

The mockup runs only local sample copy interactions. Upload, validation, downloads, actual template parsing, formula-safety decisions, persistence and future transformations are not implemented by this artifact. Its download button is intentionally disabled. The real U2 engine remains the source of truth for processing.

## What the current interface gets wrong

Inspected PRD v0.2, the implementation plan, `src/ui/Workspace.tsx`, `src/ui/styles.css`, workflow/session contracts and the running production U2 sample at 1440px. The current desktop layout gives source inspection, destination forms and output review three adjacent panels. Each output repeats a name input, source dropdown, type explanation, validation disclosure and movement controls. This makes configuration the dominant task and provides no visible connection between source and output.

The implementation reflects KTD-09 in the plan: it expressly says **“Copy mapping is a dropdown.”** This is a direct presentation conflict with the revised board-primary direction, rather than a reason to change transformation rules.

| Existing element | Proposed treatment |
| --- | --- |
| Three adjacent workspace panels | Replace with one matching board, followed by full-width output preview |
| Large source table as primary left panel | Replace with source-column cards showing two representative display values; retain original table and row references in a disclosure |
| Repeated output forms | Replace with compact, ordered output cards and one contextual field-settings panel |
| Dropdown as primary mapping interaction | Replace with source-to-output dragging and source-select → Match here; retain labelled source select in field settings |
| Bulk textarea for names | Replace primary action with Add output column; bulk entry can remain a secondary convenience if later desired |
| Template import | Retain, place next to output creation, and explain replacement before discarding existing mappings |
| Rename, move and remove | Retain as labelled controls in the selected output's settings; order numbers remain visible on the board |
| Required/max-length validation | Retain in field settings, outside ordinary matching; no validation defaults change |
| Preview/download panel | Move beneath board, preserve pagination, provenance, statuses, full counts and exact download representation |
| Upload/delimiter, sample, End session | Retain; after successful upload, compact the source controls so the board receives visual priority |
| Errors, cancel/retry, failed replacement recovery | Retain; present import/session errors above the board and field-configuration errors on affected outputs |
| Privacy notice, CSV settings, formula safety, export gating | Retain and keep visible at the appropriate review/export step |

## Proposed interaction contract

### Layout and matching

Source columns stay fixed on the left, output columns appear in export order on the right, and a narrow central gutter carries the connections. There is no canvas, zoom, pan, intermediate node or user-drawn graph. Sample display text remains faithful to the source; it is not used to infer types or matches. Full originals and provenance remain inspectable.

Each source is a selectable button and drag origin. Each output shows its order, name, state, the readable relationship **Copies [source]**, and labelled actions. A source may feed several outputs; unused sources are allowed. A source is never consumed or physically moved by matching. Each output owns one independent recipe. An unmapped output is an unfinished recipe, including when its value validation is optional; it is not an intentional blank.

Confirmed connections remain visible. Hovering/selecting an output emphasizes its connection and source; the output label communicates the same relationship without relying on lines or color. Put **Unlink** beside its output, rather than placing small delete targets among crossing lines.

| Action/state | Proposed behavior |
| --- | --- |
| No source loaded | Upload/sample action; board not editable yet |
| No outputs | Empty right side with Import template and Add output column |
| Select source | Highlight it, name it in status, change output action to Match here; Escape cancels |
| Drag source | Highlight valid output targets, show a temporary connector and target name; dropping outside outputs changes nothing |
| Match unmapped output | Commit its copy recipe, draw persistent connection, announce named source/output pair |
| Replace copy match | Deliberate drop or Match here replaces the one copy reference; announce the replacement |
| Replace future non-copy recipe | Confirm loss of existing recipe/settings before replacing; no silent discard |
| Unlink | Remove recipe reference only; output remains Unmapped; invalidate current export eligibility |
| Rename | Edit the output header, preserve its stable ID and connection; reject blank/duplicate normalized headers |
| Move up/down | Change export order, preserve stable IDs and relationships; invalidate preview/export freshness |
| Remove output | Remove field and its match; announce removal, return focus to adjacent output; offer immediate Undo in production design |
| Import template | Explain that names/order replace current outputs and mappings; Cancel preserves draft; no inferred types, recipes or confirmation |
| Busy/recovery | Show operation status and cancellation/retry; prevent changes the current session API cannot accept safely |
| Workflow error | Name the affected output and fix; block run/download, separately from row exceptions |
| Warning/invalid row | Show full-dataset counts and inspectable exceptions under preview; preserve U2 invalid-row export blocking |
| Suggested match, later U5 | Dashed connector plus Suggested label and explicit Accept/Reject; never count it as confirmed or silently persist it |

### Preview freshness — proposed decision for approval

Retain explicit **Update preview** in this U2 remediation. Board changes are immediate; preview evaluation uses the existing `Session.configure` boundary after this action. Mark any previous preview prominently **Previous preview — mappings changed**, and block download until a successful result for the current configuration finishes. If there is no prior evaluated preview, show an illustrative placeholder/empty preview, not validated output. Unmapped fields disable processing and explain the blocker. Busy results are not presented as current.

This avoids changing the existing controller's single-operation behavior while redesigning the interaction. PRD FR-27 and §8.2 currently say changes recalculate/reprocess, without clarifying whether an explicit refresh is allowed. Approval must settle this timing: the proposal is explicit refresh, **not automatic evaluation**. If immediate automatic preview is preferred, revise the plan to cover scheduling, rapid commits, cancellation and stale results; this still does not require rewriting the engine.

The mockup displays an illustrative initial partial table and labels validation pending; its sample table is not proof that production processing accepts unfinished recipes. Real preview must always preserve the distinction between a draft, a current evaluated result and export representation after a formula-safety choice.

### Accessibility and laptop layouts

- Source button → output Match here works by pointer click or Tab/Enter/Space. Escape clears the selected source. Each output also has a labelled source select; dragging is optional.
- Keep stable focus across board updates. After unlinking, focus remains on that output; after deletion, move to the adjacent output or Add output column. Closing settings returns to its initiating control. Announce source selection, mapping replacement/removal and column order changes politely.
- SVG lines are decorative, excluded from tab order and assistive reading. Names, relationship text and state labels convey the complete mapping.
- On common laptop widths, preserve the two-sided board and gutter. Use one shared vertical scroll area with sticky lane headings for long lists, rather than independently scrolling endpoints. Use generous targets, long-header wrapping and local horizontal table scrolling.
- Highlight the selected relationship when lines cross. For offscreen inputs, keep the full source name on the output; a Show source action scrolls within the shared board. Test 20+ columns before acceptance.
- On narrow screens, stack source selection and output cards and retain labelled matching controls; decorative lines can disappear. Mobile editing remains outside the release requirement.

The synthetic mockup shows the compact five-source board and a narrow-screen fallback. It does not qualify long-list behavior, assistive technology, target sizing or full WCAG conformance.

## Later recipes without making ordinary matching harder

Ordinary U2 shows copy matching only. Its field-settings panel is the eventual home for **How should this column be filled?** and the finite choices Copy / Fixed value / Split / Combine / Calculate. Show only settings applicable to the chosen recipe, with concrete examples. Date formatting and explicit trim remain field settings/modifiers, not graph nodes.

| Future recipe | Board representation | Contextual settings |
| --- | --- | --- |
| Fixed value | No incoming line; Always “DEMO” summary | Typed literal or explicit blank |
| Split | One source connection; selected segment summary | Literal delimiter, expected count, segment position, optional positions and explicit trim |
| Combine | Referenced source connections emphasized on selection; short component summary | Ordered source/literal components and separator; empties preserved |
| Calculate | Source operands connect; literal operands appear in summary | Two operands, one operation, exact decimal/precision constraints |
| Date | Copy/source connection plus format summary | Explicit input/output patterns and calendar validation |

No output-to-output dependencies, arbitrary expressions or operation chains. Renaming/reordering never changes recipe dependencies. Keep the existing version-1 schema, supported-capability guards and delivery sequence: U3 constants/trim, U5 suggestions, U6 split/combine, U7 arithmetic, U8 dates. The illustration does not advance any of those units.

## Proposed authoritative document amendments

These are recommended wording changes for approval, **not edits already applied**.

1. **PRD §5, FR-07:** Specify the primary source-left/output-right matching board, persistent connector area, drag creation/replacement, labelled click/select and keyboard equivalents, and output preview beneath it. Preserve the ban on output dependencies and general expression/graph editors.

   Suggested FR-07 wording: “Provide a constrained visual column-matching board with source columns on the left, ordered output columns on the right, and persistent connections between them. Users can drag a source to an output to create or replace a copy mapping, and can remove mappings using a labelled output action. Equivalent labelled click/select and keyboard controls must support every operation. Place the transformed preview below the board; reveal other supported destination-field recipes contextually.”

2. **PRD FR-03–05 / NFR-13:** Clarify sample display fidelity, source-row reference inspection, direct output creation/rename/removal/reorder, template names/order only, and the named non-drag interaction. These refine existing capabilities; they do not add transformation rules.
3. **PRD FR-27 / §8.2:** Settle preview refresh timing as above. If accepting explicit refresh: “Committed edits mark the previous preview out of date; Update preview evaluates the current full dataset. Download is blocked while configuration is incomplete, results are stale, or processing is pending.”
4. **PRD AC-01:** Add mapping by drag and keyboard, replace/unlink, source reuse, output management, and preview-below-board acceptance. Continue checking exact exported columns/order/bytes.
5. **Plan KTD-09:** Replace the dropdown-primary/adjacent-panel prescription with the approved board contract, contextual settings, connection states and laptop/keyboard behavior. Source select remains an equivalent labelled control. Retain paginated review and saved-workflow operator flow.
6. **Plan U2:** Add a bounded UI remediation step covering board presentation/interactions and corresponding browser tests. Anticipated production boundaries: Workspace, CSS, small board/output/settings components if helpful, browser tests and necessary review docs. Reuse session/controller, engine, adapters and schema; derive connectors from recipes rather than persisting a second graph model. No graph/DnD framework dependency is proposed.
7. **Plan U2 verification / KTD-09 checkpoint:** Require observed source-to-output matching by drag and keyboard, replacing/unlinking, reuse, template replacement/cancel, field management, full preview/error/safety review and long-list/laptop behavior. Extend existing production request-interception tests to these paths and preserve download-byte, 10,000-row and stale-result checks. Retest material operator friction.

PRD FR-38/39, row semantics, fidelity/decimal/date rules, privacy, formula safety, supported capabilities and engine architecture need no business-rule changes. Do not amend old review receipts to imply this design has been implemented or accepted.

## Review evidence and boundaries

Focused CE document-review lenses: coherence, feasibility, design, scope and security independently returned read-only findings; product and adversarial reviewers also returned focused findings on this proposal. Retained findings: KTD-09 directly contradicts the revised interaction; preview refresh timing requires an explicit decision; board-specific state/accessibility and checkpoint tests must be added. Security/scope found no need for new infrastructure or product-rule changes. This is a focused UX review, not renewed acceptance of the entire MVP or a security certification. No cross-provider review receipt is claimed. Compound pack resolver reported no packs, warnings or errors.

Mockup verification: Chromium rendered the desktop 1440px and laptop 1024px layouts, inspected screenshots, and exercised click matching, drag matching, explicit preview update, rename/reorder and unlink. Keyboard Enter mapping retained logical focus; unlink and output deletion restored focus appropriately. Source reuse, add/remove and template replace/cancel also passed. The focused sample interaction check observed no unexpected network requests. No page errors in those checks. A 390px fallback rendered with no page-width overflow. These checks verify the sample artifact only; production tests were not rerun because application code is untouched. Production U2 browser/platform limitations and its pending operator review remain as recorded in `docs/reviews/u2/README.md`.

## Approval boundary

Approve or revise the board layout, contextual settings and explicit preview-refresh proposal before authoritative amendments and a separate U2 UI remediation plan are finalized. Approval of a mockup establishes design direction only. Implementation requires separate authorization. U2 acceptance still requires the implemented operator/user journey, relevant automated evidence and retesting of material friction. **The U2 UX checkpoint remains open; do not proceed to U3.**
