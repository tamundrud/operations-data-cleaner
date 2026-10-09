# Agent instructions — Operations Data Cleaner

Applies to Codex and other coding agents working in this repository.

## Source of truth and decision rights

- Read [PRD v0.2](docs/product/operations-data-cleaner-prd-v0.2.md) before planning or writing implementation code.
- **This PRD is a draft for product review, not an approved engineering plan.** Do not begin implementation merely because it is in this repository.
- Start with Compound Engineering document review (`ce-doc-review`), resolve material ambiguities, then produce a plan (`ce-plan`). Use installed command syntax for the actual CE environment.
- Do not quietly rewrite business rules, acceptance criteria, or non-goals. Surface conflicts for product approval.
- Prefer verifiable vertical slices over speculative infrastructure, general-purpose ETL, or premature API work.

## Product invariants

- Customer files, parsed records, and session corrections must stay local in the browser for the free MVP. No file content may be sent to analytics, AI services, crash reporting, or any network endpoint.
- Transformations must be deterministic, explicit, inspectable, and testable. Do not silently guess field equivalences, round numeric values, discard records, remap changed source headers, or alter source data.
- Preserve record provenance and make workflow-level errors, invalid rows, and warnings distinct.
- Preserve string identifiers (including leading zeros); handle Excel formatting and type fidelity as specified in the PRD.
- Implement a versioned, validated workflow schema from the first slice.
- Keep output-field recipes independent, and do not introduce dependencies among generated fields or arbitrary executable scripts in the MVP.
- Treat CSV, XLSX, and imported workflow files as untrusted; protect against formula injection.
- **Use synthetic data only.** Never commit real employer, customer, shipment, invoice, billing, or personal data.

## Architecture and implementation

- Keep the transformation engine independent of user interface and persistence.
- Choose stack, libraries, source layout, performance targets, and test commands during planning. Do not assume this repository is already a runnable application.
- Test exported **bytes and data**, not only visual snapshots. Cover CSV encoding, delimiters, quoting, Excel types/dates, decimal accuracy, warnings/errors, saved-workflow round trips, and suspicious spreadsheet content.
- Add browser request-interception privacy tests with the first vertical slice. A CSP alone is not evidence of data privacy.
- Include synthetic 10,000-row dataset checks as required by the PRD.
- Avoid claims of certified interoperability with specific TMS products unless explicitly proven.

## Working practices

- Work on focused branches and propose pull requests for implementation changes. Do not bypass repository protections.
- Record material architecture decisions in `docs/decisions/` and reproducible solutions in `docs/solutions/`.
- Add tests for behavior changes and document test commands/results, limitations, and privacy implications in PR descriptions.
- Update README capability claims only after features actually work and are tested.
- Prioritize user-approved product decisions over agent preferences. Request product review when instructions conflict.
