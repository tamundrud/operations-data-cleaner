# Operations Data Cleaner — Column Matching UX Specification

**Version:** 1.0 — user-approved design direction, October 14, 2026
**Status:** Approved for U2 implementation; visual polish and implemented UX acceptance pending hands-on review
**Scope:** U2 column-mapping interface redesign
**Reference:** [Approved interactive paired-card prototype](prototype.html) and its [evidence](README.md). This specification is the design source of truth; the earlier connector-line and row-form designs are superseded.

## 1. Design objective

Create a visual, intuitive way for users to match columns from a source file to columns required by a destination system.

The experience should resemble a simple matching activity: identify two related items, bring them together, and immediately see that they belong together.

**Core principle: Matching should feel like moving cards into pairs, not filling out a configuration form.**

A first-time user familiar with Excel should be able to understand the basic interaction without a tutorial.

The design must remain effective with approximately 25 source columns and 30 destination columns.

## 2. Visual direction

Preserve the most successful aspects of the original matching-board prototype:

- Distinct, visually appealing source and destination cards.
- Spacious layout with clear visual hierarchy.
- Subtle green styling for completed matches.
- Obvious visual distinction between matched and unmatched columns.
- Sample source values displayed in smaller, secondary text.
- Output preview beneath the matching workspace.
- Simple instructions and minimal administrative controls.

Improve the original concept by eliminating long connector lines between independently positioned cards.

**Matched cards should become aligned pairs occupying a shared horizontal row.**

A short visual connector or shared highlighted background may reinforce the relationship. Long lines crossing between unrelated rows should not be used.

Avoid turning cards into persistent dropdowns, text inputs, or densely packed configuration tables.

## 3. Workspace structure

The mapping workspace contains two primary groups.

### A. Matched columns — top section

Contains all successfully paired output fields.

Each matched row displays:

- A source column card on the left.
- A destination column card on the right.
- Matching visual styling that makes the pairing obvious.
- A compact way to unlink or edit the relationship.
- A drag handle or equivalent mechanism for reordering the matched pair.

The entire pair should read as one connected visual unit.

Matched rows can be reordered without breaking their relationships.

### B. Unmatched columns — lower section

Shows the remaining work.

- Available source columns appear on the left.
- Unmatched destination columns appear on the right.
- Unmatched destination cards are obvious drop targets.
- The lists may have different lengths and do not need to align row by row.
- Used source columns remain available for additional matches.
- Users can search or filter source columns without affecting established mappings.

Each section should display a compact status count.

The board should make it immediately obvious which outputs still require attention.

## 4. Primary interactions

### 4.1 Create a match

Users can perform either action:

- Drag a source card onto a destination card.
- Drag a destination card onto a source card.

Both produce the same result.

When a match is created:

1. The two cards visually become a pair.
2. The pair receives the confirmed-match styling.
3. It appears in the Matched section above the unmatched columns.
4. The destination is removed from the unmatched destination list.
5. The original source remains available for reuse.
6. The output preview automatically updates when processing completes.

Provide immediate, lightweight visual feedback, such as a subtle transition into the matched section.

No separate Save Match or Confirm Match button should be required for a user-created match.

### 4.2 Reorder matched pairs

Users can drag an entire matched pair up or down within the Matched section.

Both cards move together.

Reordering must not change which source feeds which destination.

An explicit reorder changes the configured destination export order. The updated output preview must reflect that order.

**Important:** Simply creating a match must not silently change an imported destination template's export order. Visual grouping and export order are distinct concepts.

When pairs are initially matched, they retain their relative positions from the defined destination schema unless the user deliberately reorders them.

Use the approved prototype’s reorder rule: permute the export slots occupied by matched fields; unmatched fields stay fixed. For matched A, unmatched B, matched C, dragging C above A yields C, B, A. The secondary Output order control can move any field through the complete schema.

### 4.3 Change an existing match

Users can drag a different source onto an existing matched pair's destination.

The previous source association is replaced.

The matched pair remains in place; its source card and sample values update.

An accessible click/select alternative must provide the same action.

### 4.4 Unlink a match

A small, clearly labelled action unlinks the pair.

The output returns to the unmatched destination list, while the source remains available.

Unlinking does not delete the output column or its name.

### 4.5 Reuse a source

One source may feed several output columns.

Dragging a previously used source creates another mapping without removing the original.

The available-source card may display a subtle indicator such as "Used in 2 outputs."

Do not visually disable or remove source cards after their first use.

### 4.6 Create and manage output columns

Users may:

- Import output-column names from a template.
- Add a new output column directly.
- Rename an output column.
- Remove an output column.
- Reorder destination columns.

These actions should be discoverable but secondary to matching.

Output cards normally show their column names as text. Editing can occur contextually, rather than displaying an editable text input in every row.

Importing a template preserves its column names and order.

Replacing an existing output schema requires confirmation.

## 5. Mapping states

Use clear visual states, with text or icon indicators where needed.

| State | Visual treatment | Behavior |
|---|---|---|
| Unmatched | Neutral card, visible drop target | Awaiting selection |
| Selected / dragging | Elevated or highlighted card | Indicates current action |
| Valid drop target | Distinct border/background | Shows where the card can be released |
| Confirmed match | Coordinated green styling on both cards | Appears in Matched section |
| Suggested match (future unit) | Visually distinct from confirmed | Requires explicit user acceptance |
| Mapping error | Visible warning/error state | Provides an actionable explanation |

Color must not be the sole means of conveying status.

## 6. Preview and processing

Keep the transformed output preview beneath the matching board.

- Automatically refresh after mapping or destination-order changes.
- Use the existing debounced, revision-safe processing approach.
- Show a concise processing state when necessary.
- Never allow stale or incomplete data to be exported.
- Show unresolved mapping errors clearly without overwhelming the matching interface.
- Display validation details and exception information separately from the primary matching interaction.

No mandatory Update Preview button.

## 7. Progressive complexity

The ordinary one-to-one matching experience must remain visually simple.

Validation, data types, and advanced settings should be accessible from an individual destination card, but hidden until requested.

Later transformation recipes must be accommodated without redesigning the board:

- Constant value
- Split source field
- Combine multiple sources
- Arithmetic calculation
- Date conversion

A destination card using an advanced recipe may show a concise description such as "Combines 2 sources" or "Calculated value."

Detailed recipe configuration opens contextually, rather than occupying permanent space on the board.

Do not introduce a general-purpose node editor or transformation graph.

## 8. Accessibility

Drag-and-drop is the preferred mouse interaction, but not the only supported interaction.

Provide a clear alternative:

1. Select a source or destination card.
2. Select its counterpart.
3. Establish or change the match.

Support keyboard selection, keyboard reordering of matched pairs, visible focus indicators, and accessible status announcements.

The accessibility alternative should not determine the visual appearance of the primary interface. Dropdowns can exist in secondary controls where useful without replacing the card-matching experience.

## 9. Layout and scalability

Design for common desktop and laptop displays.

Test at minimum:

- 1440px desktop
- 1024px laptop
- 25 source columns and 30 output columns

Matched pairs must remain aligned when scrolling.

The unmatched source and destination areas must accommodate unequal list lengths.

Avoid excessive vertical spacing, huge cards, crossing connector lines, or dozens of persistent buttons.

For larger lists, provide source search, clear matched/unmatched counts, and efficient scrolling.

The layout should remain visually appealing when only a few columns are present, without wasting excessive space.

## 10. Explicit exclusions

The design must not rely on:

- Permanent source-selection dropdowns as the primary matching mechanism.
- Always-visible editable forms inside every output card.
- Long, crossing connection lines.
- Manual alignment of two independently sortable lists.
- A general-purpose workflow canvas or node graph.
- Repeated confirmation clicks for ordinary matches.
- Automatic changes to destination output order merely because a match was created.

Preserve the existing deterministic engine, workflow data model, source fidelity, validation, privacy and export safeguards.

## 11. Required design deliverables

Before any application implementation:

1. An interactive prototype demonstrating the matching interactions.
2. A desktop screenshot with several matched and unmatched columns.
3. A laptop screenshot with approximately 25 sources and 30 outputs.
4. A demonstration of dragging a source onto an output.
5. A demonstration of dragging an output onto a source.
6. A demonstration of a new pair moving into the Matched section.
7. A demonstration of reordering an existing matched pair.
8. A demonstration of unlinking and source reuse.

The prototype must demonstrate the actual visual states, not only describe them.

Do not begin another U2 implementation revision until the design has been reviewed.

## 12. Design acceptance criteria

The proposed design is ready for implementation when:

- A new user can readily identify how to make a match.
- The difference between matched and unmatched columns is immediately apparent.
- Matched pairs are visibly connected without long connector lines.
- Creating a match visibly moves the pair into the completed area.
- Matched pairs can be reordered without losing their mappings.
- A source can be reused for multiple destinations.
- The interface is understandable and manageable with 25 sources and 30 outputs.
- Administrative controls do not visually dominate the matching activity.
- The output preview and export order are clear.
- The user approves the appearance and interaction after reviewing the prototype.

**The U2 UX checkpoint remains open until the implemented interface is personally tested and accepted.**
