Intent: Replace form mapping cards with searchable reusable sources and ordered row-aligned destination mapping. Drag/click/native select alternatives; direct destination editing. Automatically debounce preview and protect export from stale/incomplete results.
Risk divisions:
- UI draft/evaluation scheduling: src/ui/Workspace.tsx, edits during busy, failed/canceled evaluations, dirty generation and export gates.
- Mapping interaction: src/ui/MappingRows.tsx, reusable source keys, external drag rejection, native selection, output identity/reorder/template replacement.
- Evidence fidelity: tests/e2e, interception privacy and delayed worker race tests; changed selectors must not weaken byte/data assertions.
Cross-division: mapping edits while evaluation completes must remain dirty and queue latest draft; template/source replacement cannot export stale bytes.
