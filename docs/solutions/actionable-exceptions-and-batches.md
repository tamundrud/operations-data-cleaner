# Preserve validation while making correction review actionable

Observed in issue #14: a five-segment Address feeding four required four-segment split outputs generated eight raw errors. Arithmetic failures also lost the source operand identity, and source pagination followed the output preview.

Keep the engine's issue list intact. Emit a structured cause key at the failure boundary, including row identity, diagnostic code and the relevant source/rule configuration. Split-family keys omit only the selected output segment; shared operand-input keys omit the destination ID while policy failures stay field-specific. Link required blanks to the upstream error keys that caused them. Build the operator list as a projection over this data, retaining raw diagnostics separately.

For multi-page editing, store drafts outside mounted table cells and outside the accepted recovery overlay. Validate every batch coordinate before evaluating or committing any edit. Keep the source query independent from the output query and page the full filtered source set. Retain newly resolved rows until explicit source navigation so operators can inspect the result and original values.

Reproduce with `tests/unit/issue-review.test.ts`, `tests/unit/worker-view.test.ts`, `tests/unit/session.test.ts`, and `tests/e2e/acceptance-corrections.spec.ts`. Check actual exported bytes, raw issue counts, invalidity, warning-only filters, original worksheet/record provenance, cancellation/retry, privacy interception and accessible explicit navigation. A green screenshot alone cannot prove these invariants.
