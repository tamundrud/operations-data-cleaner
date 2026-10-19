# Release candidate qualification (U13)

This is an internal release candidate, not final MVP acceptance. Reference-laptop qualification and final release acceptance are explicitly deferred. No deployment, publication, merge or release is authorized by this report.

## Reproduce

Use Node 24, `npm ci`, then `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`. Install Playwright browsers with `npx playwright install --with-deps chromium firefox webkit` and run `npm run test:e2e`. Privacy and performance cases are included in that full suite; they can also run with `npm run test:privacy` and `npm run test:performance`. For system Chromium use `U2_CHROMIUM_PATH=/usr/bin/chromium` and `--project=chromium`. Tests exercise the production build through the local preview server, not HMR.

See [complete synthetic example](../examples/release/README.md), [requirements matrix](release-requirements-matrix.md), and [run evidence](reviews/u13/verification.md).

## Hosting candidate and response headers

A static Nginx host with configurable response headers is a suitable candidate. Hosting selection, domain, published-origin testing and publication approval remain pending. Serve the exact `dist/` produced locally; no application backend or environment secrets are needed. Do not use runtime CDN scripts or remote fonts. Configure at least these headers on HTML, assets and error responses (`always` in Nginx):

```nginx
add_header Content-Security-Policy "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'" always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy no-referrer always;
```

Serve JavaScript as `text/javascript`, CSS as `text/css` and HTML as `text/html`. Use HTTPS. Verify response headers and repeat privacy interception against the selected production origin before release; local evidence cannot establish deployed policy. Ordinary static requests disclose request metadata to the host; uploaded file contents stay in browser memory. The hosted and local distributions use the same build and version 1 workflow format.

## Operator help and limitations

Review preview, counts and all exceptions before downloading. Warnings can be exported; invalid rows require correction or deliberate partial-export acknowledgement. Formula-like CSV text requires an explicit escaped/raw choice. Raw mode preserves bytes and may be unsafe in spreadsheets; Excel output stores text as literal cells. Proprietary destination requirements remain user-configured and must be checked in the receiving system.

Only explicitly saved workflow definitions persist in this browser's IndexedDB. Source data and corrections disappear on reload or End session. Download backups before clearing site data; clear this site's browser storage to remove its workflow library. Backups contain field names and constants, so inspect them before sharing. No source records or filenames belong in a workflow backup.

Limits remain 25 MiB source files, 200 columns, two million inspected cells, one selected XLSX sheet and the existing cancellable worker watchdog. Formula caches and Excel's prior precision loss cannot be repaired automatically. See README for supported dates, decimal syntax and Excel fidelity. Suggestion explanations, downloadable exception reports and exact-match replacements are deferred SHOULD capabilities; they are not silently treated as delivered.

## Security and acceptance boundaries

Keep dependencies pinned and retain vendor provenance and notices. `npm audit` is one input, not proof of absence of vulnerabilities; the locally vendored SheetJS dependency also has its existing U1 qualification and provenance. Existing hostile archive, formula, JSON schema, literal rendering, request-interception and session-storage tests remain required. Automated axe checks and keyboard journeys provide partial accessibility evidence, not a human accessibility audit.

Remaining release gates: reference laptop cold and five warm timings for small CSV, 10,000-row CSV/XLSX, correction and cancellation; Firefox/WebKit checks; final operator/accessibility review; hosting/domain approval; deployed CSP/privacy verification; final user release acceptance. Do not claim the full MVP is accepted while these gates remain open.
