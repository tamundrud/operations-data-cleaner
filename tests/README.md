# Tests

Use Node 24 and `npm ci`, then run:

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

Playwright starts the production server automatically. `U2_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium` selects an installed system Chromium. Keep Firefox and WebKit enabled in CI; a missing local executable is not a browser pass.

Unit tests cover strict workflows, faithful copies, typed constants, explicit trim, validation, provenance, counts, safety and independent byte goldens for all twelve delimiter × BOM × header combinations. Browser tests inspect actual downloads, bidirectional paired-card mapping and reorder, fixed-value configuration, preview generations, formula acknowledgement renewal, cancellation/recovery, accessibility and full-data fidelity. Privacy interception includes unique file, output-header and constant-value sentinels, all network origins and diagnostics, plus empty browser storage. Performance checks retain the original budgets and inspect 10,000-row output; a separate U3 check verifies every fixed/trimmed cell in all 10,000 rows.

Use synthetic fixtures only. See `docs/reviews/u3/` for actual command results, browser limitations, screenshots and CE review evidence. The XLSX qualification harness is separate from the delivered CSV application.
