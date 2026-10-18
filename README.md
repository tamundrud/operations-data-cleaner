# Operations Data Cleaner

U10 internal preview: convert a CSV or one selected Excel worksheet into explicitly matched, reordered output columns, including fixed text, exact decimal numbers, intentional blanks, strict delimiter splits, ordered combinations, exact decimal calculations and explicit date conversions. Trim text only when you choose to. Choose CSV or value-only Excel output, inspect the automatically refreshed preview, then download. Use it ad hoc, or explicitly save a named workflow in this browser and download a portable JSON backup. No account is needed.

## Run locally

Use Node 24 LTS (U6 cloud verification: Node 24.19.0).

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

The existing [U2 source](examples/u2/source.csv), [template](examples/u2/template.csv) and [configuration](examples/u2/workflow.json) remain available. Bundled configurations use the same version 1 model as saved and portable workflows. The approved U2/U3 paired-card interface and contextual settings are retained.

## Review suggested matches

Unmatched outputs show **Suggested** candidates for exact normalized header names and the curated pairs **Ship To ↔ Consignee** and **PO # ↔ Purchase Order Reference**. Choose **Accept** for a candidate, **Reject** to dismiss it in this editor session, or match another source using the existing cards/settings. Multiple candidates remain alternatives; none is selected automatically. Existing confirmed mappings and fixed values take precedence.

Suggestions use headers only, stay local, and never inspect row values. Billing parties, sales orders, stop/shipment IDs and quantities with different units are not treated as equivalents. Only explicitly configured recipes can be saved or downloaded; unresolved outputs still need a mapping or removal. Saved mappings rerun directly, and renamed or missing source headers still block processing.

## Split and combine text (U6)

Open an output column's settings and choose **Split a source column**. Choose its source, literal delimiter, expected count and segment number (starting at 1). Trimming is off until explicitly enabled. Configure each destination independently from the same original source. The count must match exactly: missing or extra segments invalidate the row. Mark optional empty positions explicitly and keep their delimiters (`a,,c,d`); positions are never guessed. Every other segment must contain text, even when selecting a different segment.

Choose **Combine sources and text** to arrange two or more source columns and literal components. Use the labeled Up/Down controls, add/remove components, and choose an exact separator (including an empty separator). Empty sources and empty literals retain their position and separator. Combination cards show the configured order; all sources remain reusable. Optional output trim affects only the combined value's boundaries.

Both recipes save and transfer in workflow version 1, including trimming, optional positions, ordered components and separators. Renamed or missing source headers still block runs. Split/combination output uses the same required/maximum-length validation, formula safety and revision checks as existing recipes. General parsing and automatic address interpretation remain unavailable.

## Exact calculations and numeric validation (U7)

Choose **Calculate with numbers** in an output column's settings. Choose two operands (each a source column or fixed decimal) and Add, Subtract, Multiply or Divide. For example, 24 units divided by a source factor of 4 yields 6 cases; 15 cases multiplied by the fixed number `12` yields 180. Field names may describe units; operands must be plain numbers (`12`, not `12 kg/case`). No factor or unit is inferred.

Calculations keep exact decimal strings (`0.1 + 0.2 = 0.3`). **No rounding — require exact result** is the default. Missing operands, non-numbers, zero divisors and nonterminating division are row errors even for optional outputs. **Maximum decimal places** limits precision without rounding or padding; excess precision is an error unless you explicitly select rounding. **Require whole numbers before rounding** rejects fractional results even if rounding would hide them. Choose **Round half up**, **Round half to even** or **Truncate toward zero** with 0–100 decimal places; rounding outputs exactly that many places, including trailing zeros. Rounding places cannot exceed the configured maximum. Optional blank copies/constants remain permitted.

For source copies, splits or combinations, choose **Output type → Number** to validate the resulting string as a strict decimal. Text remains the default to preserve identifiers. Numeric parsing accepts an optional sign, digits and a decimal point (`12.50`, `+.5`, `-2.`); whitespace, currency, separators, units and exponents fail. Number fields do not trim input; correct source whitespace explicitly. Fixed numeric literals without rounding retain the approved original representation.

Inputs are limited to 1000 characters each before numeric parsing; results are limited to 2000 digits, counting integer and fractional padding. Excess expansion is an explicit precision-limit error, never a truncated result. Exact division beyond this budget can use explicitly chosen rounding. All settings remain compatible with workflow version 1, local saves and portable JSON. Missing source headers still block runs; changing numeric settings invalidates old export decisions.

## Explicit date formats (U8)

In an output column's settings choose **Output type → Date** (or **Fixed value type → Date**). Choose both **Source date format** and **Output date format**: `YYYY-MM-DD`, `MM/DD/YYYY`, or `DD/MM/YYYY`. Neither is inferred. With source `MM/DD/YYYY`, `10/08/2026` becomes `2026-10-08`, and `03/04/2026` means March 4; choose `DD/MM/YYYY` to interpret it as April 3.

Only zero-padded calendar dates with years `0001`–`9999` are accepted. Impossible dates, invalid leap days, timestamps and mismatched patterns fail visibly. Dates use calendar arithmetic without browser timezone conversion. Empty optional dates remain blank; required blanks fail. Whitespace changes only with explicit trimming. Date interpretation follows the independent primary recipe (copy, fixed text, split or combine), and keeps original source values intact. Numeric calculations cannot become dates. Formats, trimming and required rules save and transfer in workflow version 1; changing rules renews export safety decisions. For date-formatted numeric Excel cells, choose **Excel date cell (workbook calendar)** as the source format. Both workbook calendars are honored; invalid serials and time components fail visibly.

## Excel input (U9)

Upload an ordinary `.xlsx` table and choose one worksheet when the workbook has several. Sheets are never merged. The first nonblank row supplies unique headers; blank rows are counted separately and footer rows remain data. XLSX destination templates supply names and order only.

Inspect **Excel cell details** for original type, raw value, displayed text, format, workbook calendar and formula. Supported zero padding preserves `001234`; arithmetic uses the raw numeric value. Unsupported formats and suspicious numeric identifiers carry warnings; digits already lost in Excel cannot be recovered. Referenced cached formula values may be stale; missing/error caches block the dependent rows. No formula, hyperlink, HTML or external relationship is executed or fetched. Use **Show only rows with exceptions** to read warning reasons.

Workbooks are checked before parsing: 25 MiB source, 100 MiB actual expanded data, 4,096 archive entries, 2 million cells, at most 200 table columns and 256 characters per number format. Unsupported ZIP64/encrypted/unsafe archives fail with remediation rather than truncation. A 30-second watchdog and cancellation terminate worker processing; these budgets are not a heap-memory cap. Browsers need native `DecompressionStream("deflate-raw")`; update an unsupported browser or save UTF-8 CSV. Failed imports retain the previous run. Selected worksheet and import settings travel with saved workflows, without source records or filenames.

## Value-only Excel output (U10)

Beside the preview, choose **Output format → Excel workbook (.xlsx)**. The download is a new workbook with one `Output` worksheet containing only the configured columns, in their export order. Choose whether to include headers and the **Excel date system** (1900 by default, or 1904). Dates use the field's selected display format and calendar components, without timezone conversion. Dates before the chosen epoch fail with an actionable CSV/text alternative. CSV delimiter/BOM settings remain saved when switching formats.

Text, including leading-zero identifiers, formula-like values and headers, stays literal. Source formulas, hyperlinks, macros, external relationships and other workbook parts are never copied. Usable cached source formula values retain their stale-cache warnings. Excel output requires no CSV escaping acknowledgement; returning to CSV restores its explicit formula-handling choice.

Excel numbers must have at most 15 significant decimal digits, fall within Excel's normal numeric range, and serialize back to the exact intended decimal value. `0.1 + 0.2` writes numeric `0.3`. Precision/range loss blocks the download with the source record and output field; choose CSV or deliberately change the field to text. No automatic rounding or text fallback occurs. Numeric spellings such as `+0012.500` become the number `12.5`; use a text field when that spelling is an identifier or must remain literal. Internal calculations and CSV retain their existing exact decimal behavior.

Output is limited to 2 million table positions (including headers), Excel's 1,048,576 rows and 32,767 UTF-16 units per text cell, plus a conservative 100 MiB serialization budget that bounds XML escaping and package overhead before writing. Literal OOXML escape tokens such as `_x0041_` are protected; their additional encoding must also fit the writer's text limit. Invalid Unicode or over-budget output fails explicitly without truncation. Cancellation and the existing worker watchdog cover serialization. These are resource safeguards, not a heap cap or final reference-laptop qualification.

Excel settings and every delivered destination type reuse workflow version 1, including browser saves and portable JSON. Existing CSV definitions require no migration. Download still requires the current preview and all rows to pass configured validation; source correction and partial export remain later work.

SheetJS CE 0.20.3 is vendored from the verified official distribution; its [Apache-2.0 license](public/SheetJS-LICENSE.txt) ships with the application. See [qualification and limits](docs/decisions/excel-fidelity.md).

## Save, repeat and recover

Name the current configuration and choose **Save workflow**. Save is explicit: changing rules, uploading a source, or importing a workflow does not automatically update saved definitions. **Save changes** updates the opened saved definition; **Save a copy** needs a distinct name. Identity/name conflicts require an explicit replacement or copy. Changes from another tab are detected before replacement.

Choose a definition under **Saved workflows**, then **Open workflow**, upload a compatible new CSV or Excel workbook, review and download. Source columns may be reordered or have extra unused columns; missing/duplicate/changed required headers block the run without guessing. **Edit workflow** reveals the existing matching board. Opening another definition clears the old source only after validation and any replacement confirmation.

**Download workflow** produces `workflow.json` without needing a source or working browser storage. Use **Import workflow** in another browser or local instance, then upload its compatible source. Import validates supported configuration before replacing anything and opens a draft; Save separately if you want it in that browser. Future versions and currently undelivered recipes/settings are rejected clearly.

Browser storage belongs to this browser and site origin, can be cleared, and is not shared automatically. Keep the prompted portable backup and store it somewhere durable. Workflow files contain field names and configured constants that may reveal business information; review them before sharing. Source records and filenames are excluded. Reload and **End session** clear source data; saved definitions remain available. **New conversion** starts an ad hoc draft after confirming replacement when needed. If storage fails, continue ad hoc or download a backup; **Retry workflow storage** retries the local library without discarding your conversion.

## Delivered limits and privacy

- UTF-8 CSV with optional input BOM; comma, semicolon or tab input. First nonblank record is the header; normalized empty/duplicate headers and malformed quotes/extra cells fail explicitly.
- Every output must have a source copy, fixed text/number/blank, split, combination or calculation recipe. Text supports optional required/max-length validation and explicit boundary trim. Numeric constants use a strict decimal string grammar: optional sign, digits and decimal point; no currency, thousands separators or exponents. `12.50`, `+0012.500` and long decimals retain their exact representation without floating-point conversion or rounding. Fixed text is limited to 4096 characters and decimal literals to 1000 characters. Number outputs support strict source conversion, whole-number checks, maximum decimal places and explicit rounding. Optional blanks succeed; required blank/whitespace-only values block the whole download.
- Default output: UTF-8, no BOM, comma, headers, standard quoting, CRLF. Choose comma, semicolon or tab, BOM on/off and header on/off. Preview retains column labels for identification even when the exported header is omitted. Formula-like text (including constants) and included headers require an explicit escaped/raw choice; preview shows the selected representation. Typed numeric constants are not formula text. Escaping changes text and cannot promise protection in every spreadsheet/importer. Raw text may be unsafe to open in spreadsheets.
- Full dataset counts with paginated output and exception rows (50 per page). Nonblank totals are ordinary candidates. No silent record truncation. Limits: 25 MiB source, 200 columns, 2 million inspected cells, 30-second cancellable worker watchdog.
- Files and parsed data stay in browser memory and are cleared by reload or End session. Only explicitly saved workflow configurations use IndexedDB; no source data or filename is persisted. No localStorage, service worker, analytics, remote fonts, or upload endpoint. Static application code/assets still use ordinary host requests and metadata. Processing runs in a local Web Worker.
- Source correction and partial export belong to later units. Other encodings and export formats are unsupported. This is not the full MVP or certified TMS interoperability.

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
