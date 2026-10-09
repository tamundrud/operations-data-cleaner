# Operations Data Cleaner

**Status: planning — not yet implemented.**

Operations Data Cleaner is a planned free, open-source browser application for preparing operational CSV and Excel data for import into other systems. The initial use case is converting customer or partner order exports into a transportation management system (TMS) import format.

## Intended workflow

1. Load a CSV or Excel (`.xlsx`) source file.
2. Define output columns using a sample template, manual schema, or saved workflow.
3. Confirm field mappings and apply explicit transformations.
4. Review output, warnings, and invalid records.
5. Export a configured CSV or Excel file and optionally save the workflow locally for reuse.

**These are proposed requirements, not shipped capabilities.** The PRD is still a draft pending document review, product decisions, and engineering planning.

## Privacy objective

The MVP is designed to process customer data entirely on the user's device without an account, upload API, or server-side data processing. This is an implementation and test requirement, **not yet a demonstrated guarantee**. Network-interception tests will be necessary before publishing privacy claims for a running application.

## Project documentation

- [Product requirements v0.2](docs/product/operations-data-cleaner-prd-v0.2.md) — full draft specification and acceptance scenarios.
- [Agent instructions](AGENTS.md) — guardrails for Codex and implementation agents.
- [Engineering plans](docs/plans/README.md) — Compound Engineering plans after product review.
- [Engineering decisions](docs/decisions/README.md) — significant architecture decisions and trade-offs.
- [Engineering learnings](docs/solutions/README.md) — reusable discoveries during implementation.
- [Repository owner checklist](REPO_SETUP.md) — GitHub settings requiring manual configuration.

## Local development

No application stack or build commands are committed yet. These will be added after `ce-doc-review` and `ce-plan` establish an approved implementation approach.

## Commercial positioning

The open-source application is distinct from potential future paid implementation services, integrations, hosted processing, or optional decision services. None of those services belongs in the MVP without a separate decision.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Only fictional/synthetic files should be published in examples, tests, issues, and pull requests.

## License

Licensed under the [Apache License, Version 2.0](LICENSE), which permits commercial use, modification and redistribution subject to its terms.
