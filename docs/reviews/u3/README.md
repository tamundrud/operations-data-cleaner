# U3 delivery evidence

Fixed text, exact numeric and intentional-blank outputs, explicit text trim, and CSV delimiter/BOM/header settings are implemented on `feat/u3-fixed-trim-csv`, based on main at `7192c36` (merged U2 PR #2). No dependencies or storage were added. U3 remains a draft for user hands-on UX approval; no merge, deployment or U4 work is included.

## Functionality and design

Output-card settings choose source copy or fixed text/number/blank. Fixed fields join the completed rows with a noninteractive “Fixed value / No source needed” summary, no source card and no connector arrow. They use the existing reorder grip and completed-slot rule; unmatched slots stay fixed. Source matching, reuse, bidirectional drag and keyboard alternatives remain covered.

Text trim is explicit and off by default. Required/max-length rules inspect the resulting text; original source values remain inspectable. Numeric constants retain validated decimal strings such as `12.50` without floating-point conversion or rounding. CSV settings sit beside preview/download and use the same draft-generation/revision guards, clearing prior formula choice. Header-off exports retain identifying labels only in the preview.

## Verification

See [reproducible commands and initial results](verification.md), [Chromium full-suite JSON](chromium-initial.json), [U3 accessibility JSON](accessibility.json), [post-review transition tests](review-followup-tests.json), and [browser launch failures](other-browsers.json).

- Typecheck, lint and production build passed. All 69 unit tests passed.
- All 37 production Chromium tests were exercised: the full 34-test run, one subsequently added accessibility test, and two post-review transition tests. No production files changed between those runs. All passed without skips or flaky results.
- Unit and browser tests verify every delimiter × BOM × header combination against independent exact bytes, including UTF-8, quotes, embedded delimiters/newlines and column order.
- Privacy interception includes distinctive source, output-header and constant sentinels, outgoing URLs/headers/bodies, diagnostics, WebSockets and empty browser storage. It passed.
- The U3 10,000-row check verifies every downloaded value, counts and paginated source references. The existing 10,000 × 20 pipeline warm median/worst was 650/732ms (<5000ms); 499 × 20 preview was 181/197ms (<1000ms). [Large](timings.json) and [small](small-timings.json) measurements include cloud automation overhead and are not reference-laptop qualification.
- Firefox and WebKit were attempted but did not launch. Installation attempts returned HTTP 403 / Domain forbidden. No local app assertions ran in those browsers. The GitHub CI workflow retains all three production browser projects; its status is recorded in the PR.

## Screenshots

Production screenshots use only the synthetic U3 example. The [capture script](capture.mjs) verifies exact sample bytes, no horizontal page overflow and no page errors; [observations](capture.json) record Chromium 154.0.8037.57.

| State | Desktop 1440px | Laptop 1024px |
| --- | --- | --- |
| Workspace and CSV settings | [Image](workspace-1440.png) | [Image](workspace-1024.png) |
| Completed fixed values and intentional blank | [Image](completed-values-1440.png) | [Image](completed-values-1024.png) |
| Fixed-number settings | [Image](fixed-settings-1440.png) | [Image](fixed-settings-1024.png) |
| Explicit trim settings | [Image](trim-settings-1440.png) | [Image](trim-settings-1024.png) |

## Compound Engineering

The installed CE workflow definitions and phase references governed planning, implementation, simplification, review and delivery. [Planning evidence](plan-review/README.md) records six-persona requirements review followed by six-persona scoped-plan review. [Simplification](simplification.md) records all three prescribed reviewers, no worthwhile changes and passing checks. [Code-review receipt](ce-review/review.json) records eight completed lenses, no defects and an empty validation batch. [Follow-up](review-followup.md) independently confirms and closes two testing advisories.

There was no eligible different-provider route; the prescribed local adversarial fallback completed. The review's original cost metadata and full stage timings were lost during environment restart; [recovery notes](ce-review/RECOVERY.md) distinguish restored authored evidence from unavailable telemetry. No informal self-review substitutes for the completed CE receipt.

Remaining product gate: personal U3 UX testing. Local Firefox/WebKit and reference-device qualification remain documented limitations. Source correction, persistence, suggestions, advanced transformations, Excel and partial export remain excluded.
