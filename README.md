# Operations Data Cleaner

U2 internal preview: a browser application that converts a CSV into an explicitly mapped, reordered CSV. Upload your source, enter destination columns or upload a CSV header template, choose each copy mapping, preview all rows, then download. Identifiers and whitespace remain text. Nothing needs an account or a saved workflow.

## Run locally

Use Node 24 LTS (implementation environment: Node 24.19.0, npm 11.9.0).

```sh
npm ci
npm run build
npm run preview
```

Open **http://127.0.0.1:4173**. This serves the production application and privacy policy. `npm run dev` starts Vite for development; its HMR traffic and styles conflict with the restrictive production CSP, so use build/preview for product verification. No deployment or server-side file processing is involved.

## Working synthetic example

Select **Try sample data** to run the bundled, fictional order conversion. Download should match [expected.csv](examples/u2/expected.csv), including `001234`, quoted commas, an embedded newline, and preserved spaces.

For a personal usability check, start a fresh session and use [source.csv](examples/u2/source.csv) and [template.csv](examples/u2/template.csv). Try mapping, renaming/reordering, inspecting the result and downloading using only the interface. The ready-made [workflow.json](examples/u2/workflow.json) is the bundled configuration, not an import/persistence feature in this build. Please report where the next action, source/output distinction, errors, export settings or keyboard controls were unclear. **User UX approval is pending**; automated tests cannot close it.

## Delivered limits and privacy

- UTF-8 CSV with optional input BOM; comma, semicolon or tab input. First nonblank record is the header; normalized empty/duplicate headers and malformed quotes/extra cells fail explicitly.
- Copy mapping only; all output fields must be mapped. Text type, optional required/max-length validation, no automatic trimming or numeric conversion. Invalid rows block the whole download; fix/reupload or change your rules.
- Default output: UTF-8, no BOM, comma, headers, standard quoting, CRLF. Formula-like text/headers require an explicit escaped/raw choice; preview shows the selected representation. Escaping changes text and cannot promise protection in every spreadsheet/importer. Raw text may be unsafe to open in spreadsheets.
- Full dataset counts with paginated output and exception rows (50 per page). Nonblank totals are ordinary candidates. No silent record truncation. Limits: 25 MiB source, 200 columns, 2 million inspected cells, 30-second cancellable worker watchdog.
- Files and parsed data stay in browser memory and are cleared by reload or End session. No localStorage, IndexedDB, service worker, analytics, remote fonts, or upload endpoint. Static application code/assets still use ordinary host requests and metadata. Processing runs in a local Web Worker.
- Excel, constants, advanced recipes, export options, saved workflows, suggestions, source correction and partial export belong to later units. This is not the full MVP or certified TMS interoperability.

## Verify

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
npm run test:privacy
npm run test:performance
```

Tests serve the production build and check real download bytes. `U2_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium` uses an existing system Chromium when supplied. CI runs all three browsers. Performance artifacts distinguish cloud smoke timing from the pending reference-laptop qualification.

See [PRD](docs/PRD.md), [implementation plan](docs/plans/2026-10-11-1607-feat-operations-data-cleaner-plan.md), [U1 qualification](docs/decisions/excel-fidelity.md), and [browser processing decision](docs/decisions/browser-processing.md). Use synthetic data only in published examples, issues and tests. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Licensed under [Apache-2.0](LICENSE). Dependency license files are retained in npm packages; redistribution details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
