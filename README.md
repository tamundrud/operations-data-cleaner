# Operations Data Cleaner

U3 internal preview: convert a CSV into explicitly matched, reordered output columns, including fixed text, exact decimal numbers and intentional blanks. Trim text only when you choose to. Select CSV delimiter, BOM and header settings, inspect the automatically refreshed preview, then download. Nothing needs an account or a saved workflow.

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

Select **Try fixed fields example** for [the U3 source](examples/u3-source.csv) and [configuration](examples/u3-workflow.json). It adds text `0012`, number `12.50`, an optional blank and explicit Consignee trimming. Download matches [the U3 golden file](examples/u3-expected.csv): semicolon, UTF-8 BOM, no header, CRLF. Internal spaces stay unchanged. Both examples are fictional.

Open an output card’s **⋯** settings to choose **Copy a source column** or **Use a fixed value**. Fixed fields join completed rows with a “No source needed” summary and can be reordered with matched pairs. Text identifiers preserve leading zeros and whitespace. **Remove leading and trailing whitespace** is off by default and operates before required/maximum-length checks; originals remain available under **Inspect original source table**. CSV settings sit beside preview/download; changing any configuration blocks old downloads and clears formula handling until the current result is checked.

The existing [U2 source](examples/u2/source.csv), [template](examples/u2/template.csv) and [configuration](examples/u2/workflow.json) remain available. Bundled configurations demonstrate the version 1 model; this build has no workflow import or storage UI. U2 has been user approved; **U3 UX approval remains pending hands-on testing**.

## Delivered limits and privacy

- UTF-8 CSV with optional input BOM; comma, semicolon or tab input. First nonblank record is the header; normalized empty/duplicate headers and malformed quotes/extra cells fail explicitly.
- Every output must have a source copy or fixed text/number/blank recipe. Text supports optional required/max-length validation and explicit boundary trim. Numeric constants use a strict decimal string grammar: optional sign, digits and decimal point; no currency, thousands separators or exponents. `12.50`, `+0012.500` and long decimals retain their exact representation without floating-point conversion or rounding. Fixed text is limited to 4096 characters and decimal literals to 1000 characters. Numeric source conversion, scale and rounding rules remain deferred. Optional blanks succeed; required blank/whitespace-only values block the whole download.
- Default output: UTF-8, no BOM, comma, headers, standard quoting, CRLF. Choose comma, semicolon or tab, BOM on/off and header on/off. Preview retains column labels for identification even when the exported header is omitted. Formula-like text (including constants) and included headers require an explicit escaped/raw choice; preview shows the selected representation. Typed numeric constants are not formula text. Escaping changes text and cannot promise protection in every spreadsheet/importer. Raw text may be unsafe to open in spreadsheets.
- Full dataset counts with paginated output and exception rows (50 per page). Nonblank totals are ordinary candidates. No silent record truncation. Limits: 25 MiB source, 200 columns, 2 million inspected cells, 30-second cancellable worker watchdog.
- Files and parsed data stay in browser memory and are cleared by reload or End session. No localStorage, IndexedDB, service worker, analytics, remote fonts, or upload endpoint. Static application code/assets still use ordinary host requests and metadata. Processing runs in a local Web Worker.
- Excel, split/combine/arithmetic/date operations, saved workflows, suggestions, source correction and partial export belong to later units. Other encodings and export formats are unsupported. This is not the full MVP or certified TMS interoperability.

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
