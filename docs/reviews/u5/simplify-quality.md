# U5 simplification: code quality review

Reviewed the branch against `origin/main`, including `src/suggestions/`, the new unit/browser scenarios, MappingRows, the Workspace footer, styles, and screenshot capture script. Applied the installed `ce-simplify-code` Code Quality Reviewer rubric in read-only mode with the U5/KTD-09 structure constraint.

## Findings

- **Low — `src/ui/MappingRows.tsx:266`:** Adding the suggestion branch makes the output status a three-level nested conditional expression. The four statuses now require reading interleaved JSX and ternaries. Concrete fix: extract a small `outputSummary(f, paired)` function with early returns for constant recipes, confirmed copies, suggestions, and unmatched fields; interpolate its result in the existing span. Preserve the exact strings, ordering, `paired` semantics, and trim suffix.

## Already sound

- Suggestions are derived from unmatched fields; no redundant suggestion state or synchronization effect is introduced.
- Rejected candidates carry actual user intent, so their local state cannot be replaced by derived state.
- Matching stays separate from confirmation and persistence. Accept reuses the established `match` path.
- Dictionary and matching exports have verified in-repository consumers. No unused imports or dead branches were found.
- The new wrappers provide grouping, layout, or accessibility roles. Dictionary and matcher comments explain domain and trust-boundary constraints.
- No speculative compatibility removal or new abstraction is recommended.

Applied: 0 (read-only review). Suggested: 1 low-priority clarity improvement. Validation remains the parent workflow's responsibility; no implementation files changed.
