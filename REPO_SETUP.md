# Repository owner checklist

This file covers settings **not configurable by the current ChatGPT GitHub integration**. It can be deleted after setup.

## Repository presentation

- Description: `An open-source tool for cleaning, validating, transforming, and exporting operational data from CSV and Excel files.`
- Suggested topics: `data-cleaning`, `csv`, `excel`, `data-transformation`, `open-source`, `logistics`, `operations`. Add `typescript` only once the stack is selected.
- Keep the repository public, with Issues and Actions enabled. Disable Wiki; defer Discussions and Projects until needed.

## Settings → General → Pull Requests

- Allow squash merge; optionally disable merge commits and rebase merging.
- Enable automatic deletion of head branches after merge.

## Settings → Rules → Rulesets (after working CI exists)

- Protect `main`: require pull requests and passing tests once actual CI checks are configured.
- For a solo project, do not require an external approving reviewer.
- Prevent force pushes and branch deletions.
- Avoid requiring nonexistent or placeholder CI status checks.

## Settings → Security

- Enable Dependabot alerts and supported secret scanning and push-protection features.
- Enable private vulnerability reporting if available.

## Start development

1. The full PRD is committed at `docs/product/operations-data-cleaner-prd-v0.2.md`.
2. In Codex, run Compound Engineering's setup command (for example `/ce-setup` where supported).
3. Run `ce-doc-review` against the draft PRD; resolve product questions before approval.
4. Run `ce-plan` and review the architecture, testing approach, and vertical slices.
5. Scaffold the application and real CI as part of the approved plan.

Do not invent a `.compound-engineering/` directory or a green placeholder workflow. Let the installed framework and chosen build tools establish those conventions.
