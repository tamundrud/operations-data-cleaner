# U1 Excel qualification

This is an isolated synthetic-data browser-worker experiment, not application code. It does not implement U2 or any production UI, transformation engine or persistence.

```sh
cd tests/qualification/xlsx
npm ci --ignore-scripts
npx playwright install --with-deps chromium firefox webkit
npm test
node run.mjs --baseline
```

`npm test` regenerates `results.json`; the baseline command regenerates `baseline-results.json`. Fixtures are generated deterministically from `fixtures.mjs`, using invented values and independent OOXML rather than the reader's writer. Nothing is uploaded. The local HTTP server serves a finite list of static scripts; file bytes enter the page through Playwright and the worker through structured clone.

Tests cover raw/value/display/format metadata, both date epochs, invalid/time-bearing serials, formula-cache provenance, literal-only export ZIP/XML, actual expansion/CRC/local-directory consistency, hostile worksheet references, source size, cancellation, two timezones, request interception and complete 10,000 × 20 data cells. The 8 MiB compression probe uses a 1 MiB budget to test actual-byte stopping cheaply; the default expanded-workbook budget remains 100 MiB.

The native preflight is the recommended mechanism. The fflate branch is retained solely to reproduce the dependency comparison. `fflate` and Playwright are development dependencies here; SheetJS is pinned to its official tarball. There is no runtime CDN request.

A missing browser is reported explicitly in JSON. At least one browser must run for the command to succeed; inspect all three entries before claiming cross-browser qualification. Optional `ODC_WEBKIT_EXECUTABLE` selects an existing local launcher when the host needs isolated dependency provisioning. The recorded run used Ubuntu packages `libavif16`, `libgav1-1`, and `libyuv0` extracted into `/tmp`, with a wrapper reproducing Playwright's bundled WPE environment; no system package installation or repository browser patch was needed.

No repository-wide typecheck/lint/build command exists yet. Syntax verification:

```sh
for file in *.mjs client.js; do node --check "$file"; done
npm audit
```

See [the Excel feasibility decision](../../../docs/decisions/excel-fidelity.md) for measurements, limitations and the U9/U10 obligations.
