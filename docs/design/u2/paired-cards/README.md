# U2 paired-card matching design

Status: **user-approved design direction for implementation (October 14, 2026); final polish and application acceptance pending**. The U2 UX checkpoint remains open. No U3 work is authorized by this artifact.

This is the latest design reference. It supersedes the interaction and preview-refresh proposals in the parent folder's original matching-board mockup. [SPECIFICATION.md](SPECIFICATION.md) is the approved implementation contract, with this prototype as its visual and interaction reference.

## Review artifacts

- [Complete user specification — Draft 1.0](SPECIFICATION.md)
- [Interactive prototype](prototype.html): open directly in a browser; no build, server or dependencies needed.
- [Desktop, 1440px](evidence/desktop-1440.png)
- [Laptop, 1024px, 25 sources and 30 outputs](evidence/laptop-1024-25x30.png)
- [Recorded interactions](evidence/interaction-demo.webm)
- [Source onto output](evidence/source-to-output.png)
- [Output onto source](evidence/output-to-source.png)
- [Reordered pair](evidence/reordered-pair.png)
- [Unlinked pair](evidence/unlinked-pair.png)

The original temporary files were no longer present on October 14. The HTML was recovered from the October 13 session's creation and subsequent edit records. Screenshots and the recording were regenerated from this recovered prototype; they are not the original capture bytes.

## Try the interactions

1. Drag Notes onto Delivery Notes; the pair joins Matched above. Export positions stay unchanged.
2. Drag Delivery Date onto Requested Date to match in the opposite direction.
3. Drag PO # onto Service Type; the Reference mapping remains and the source shows two uses.
4. Drag another source onto a matched destination to replace its association.
5. Drag a pair's grip onto another visible pair. Both cards move together. Alt+Up/Down on the grip provides keyboard reordering.
6. Unlink with the labelled × action; the output returns below without being deleted.
7. Select a source or destination with click/Enter, then select its counterpart. Escape cancels selection.
8. Switch to the 25-source/30-output example; search sources and scroll the sections independently.
9. Use contextual ⋯ settings for rename, source choice, movement and removal. Add output and confirmed synthetic-template replacement are secondary controls.

## Approved ordering behavior

Matching, rematching, searching and unlinking preserve configured export order. The Matched section is a filtered view of confirmed fields, sorted by schema position.

The approved prototype specifies that deliberate pair reordering permutes the export slots occupied by matched fields, while unmatched fields stay fixed. A matched A, unmatched B, matched C schema becomes C, B, A after dragging C above A. The separate Output order control can move any output through the complete schema. The user approved the latest prototype’s interaction model; retain this rule in U2.

## Authorized U2 implementation handoff

- Replace the primary mapping forms with matched source/destination cards above the reusable source and unmatched output areas. Keep field settings contextual and preview below the board.
- Derive pairing from existing destination-field recipes and export order from the workflow's `fields` array. Do not persist a second graph or visual-order model.
- Keep the current engine, data contracts, source fidelity, validation, formula-injection protection and browser-only privacy guarantees.
- Reuse the production debounced, revision-safe scheduler. No mandatory Update Preview button. Export must remain blocked during pending processing, stale results, incomplete configuration or blocking errors.
- Future recipes can show a short destination-card summary and open a contextual editor. They are outside this U2 revision.
- Amend PRD mapping/accessibility acceptance and plan KTD-09's dropdown-primary presentation under the October 14 user approval. Record automatic refresh as the user-selected direction. Preserve business rules and engine acceptance tests.
- Verify both drag directions, replacement, unlink, reuse, keyboard focus/status, pair/full-schema ordering, template confirmation and contextual editing. Check 1440px and 1024px with 25 sources/30 outputs. Preserve privacy interception, exact exported-byte/data, stale-result and 10,000-row tests.
- Complete the mandatory Compound Engineering code review for application changes, documenting any incomplete steps. Keep the existing PR draft and the UX checkpoint pending personal testing. Stop before U3.

## Prototype limits and evidence

All samples are synthetic. State is held locally in memory. The prototype simulates a debounced copy preview with revision checks; production parsing, validation, template-file reading, recipes, persistence and actual export are not connected. Download is intentionally disabled. A missing-source error demonstration is illustrative.

The regeneration check exercises native Chromium dragging in both directions, order preservation when matching, reuse, pair reordering, unlink, keyboard matching and keyboard reorder. The large fixture contains 25 sources, 10 paired outputs and 20 unmatched outputs. Screenshots and the recording demonstrate the design, not production qualification or user acceptance. No application code was changed or production test-suite result claimed for saving these artifacts.

To reproduce the saved evidence after installing the repository dependencies and Chromium:

```sh
node docs/design/u2/paired-cards/verify-and-capture.mjs
```

October 14 regeneration result: no page errors; both native drag directions and order/reuse checks passed; large fixture counts 25 sources / 10 pairs / 20 unmatched; no page-width overflow at 1024px.
