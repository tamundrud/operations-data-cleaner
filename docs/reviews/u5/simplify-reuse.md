# U5 simplification: code reuse review

Reviewed the U5 branch changes against `origin/main`, including the untracked suggestion module, unit/browser tests, screenshot capture script, MappingRows additions, footer, and styles. Applied the installed `ce-simplify-code` Code Reuse Reviewer rubric in read-only mode; preserved U5/KTD-09 boundaries.

No actionable reuse findings.

- Header matching reuses `normalizeHeader` from `src/engine/workflow.ts`; there is no existing logistics equivalence implementation to reuse.
- Accept uses the existing `MappingRows.match` path, preserving recipe creation, selection cleanup, announcements, and focus behavior.
- Browser scenarios reuse the existing `add`, `upload`, `download`, `map`, and `fixed` helpers. The workflow JSON download differs from the CSV-specific `download` helper, so substituting it would change assertions and behavior.
- Rejection keys need field identity, normalized destination name, and source identity. Existing source lookup keys alone do not provide an equivalent guarantee.
- Native array filtering preserves source order and all alternatives. No behavior-equivalent downstream projection or framework guarantee makes the confirmation or rejection logic redundant.
- Screenshot setup remains a standalone runnable `.mjs` evidence script; introducing shared screenshot infrastructure for this slice is not warranted.

Applied: 0. Skipped speculative refactors: 0. No implementation files changed. Validation remains the parent workflow's responsibility because this was a read-only review.
