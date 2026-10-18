# U10 — value-only typed Excel export

Scope: U10 only, based on `main` at `eb64ab2a8e065d5441f6246636cea8e14a3411df` (approved U9). Branch: `feat/u10-value-only-excel-export`. No U11 work, merge or deployment. Hands-on UX acceptance remains the user's gate.

## Delivered contract

- CSV→XLSX and XLSX→XLSX use the existing vendored SheetJS CE 0.20.3, inside the existing revision-checked worker and watchdog. No dependency or archive-preflight changes.
- A fresh `Output` worksheet receives only evaluated values, selected fields/order, optional headers and explicit blank extent. Text uses shared strings; numbers use numeric cells; dates use integer calendar arithmetic and explicit date formats/1900 or 1904 epochs. No source formulas, links, macros or package parts are copied.
- Numbers exceeding 15 significant decimal digits, Excel's normal range or exact decimal serialization fail with record/field/action context. No rounding or automatic text fallback. Pre-epoch dates fail with CSV/text alternatives. Literal `_xHHHH_` tokens are protected against OOXML decoding; malformed Unicode and text/row/resource excess fail without truncation.
- Version-1 workflow structure remains unchanged. Output settings and all destination types survive saved/reopened and portable JSON paths. Existing CSV settings and safety choices, full-dataset eligibility and revision protections remain intact.

## Verification

At implementation commit `91b32a6559c29e0baea333e7e1ae8cead21a1bf3`, `npm run test:unit` passes all 276 tests; `npm run typecheck`, `npm run lint` and `npm run build` pass. `U2_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --project=chromium` passes all 97 tests (7.8 minutes), including all ten U10 scenarios. Exact command output is retained in [validation](validation/). The corrected performance check uses KTD-10's 15-second XLSX pipeline budget and measures one first trial plus five repeated trials for each input format. Earlier CSV budgets remain unchanged.

The new tests inspect ZIP members, workbook/worksheet/shared-string/style XML and cell types independently of SheetJS. A Python-generated SHA-256 golden covers all 200,020 output positions/types/values of the large table. Supplementary SheetJS rereads and an independent `openpyxl` 3.1.5 + ElementTree check corroborate the synthetic downloaded workbook. See [independent-reader.json](independent-reader.json), [synthetic-output.xlsx](synthetic-output.xlsx), and the executable [inspection](inspect-output.py).

Proof-first evidence: the initial writer suite failed because the writer module did not exist. Additional literal-token regressions reproduced `_x0041_` becoming `A` in the unqualified writer/reader path. Inspection of SheetJS's `escapexml`, `unescapexml` and `t="str"` handling identified missing token protection and double decoding. The final shared-string encoding passes independent XML and library checks, including overlapping tokens. CRLF is preserved in the workbook XML even though SheetJS normalizes it when reading; the independent decoder asserts original text before that normalization.

A final source-isolation probe reproduced hidden custom-format leakage through SheetJS's global SSF table despite `book_new()`. The regression first failed with `PRIVATE_U10_SOURCE_FORMAT` present in generated styles; explicitly supplying only General and approved date formats fixes the boundary. The initial failure was observed before the fix; its temporary raw log was lost during the environment restart. The regression source and [observed-failure summary](validation/proof-first.json) retain the reproducible case. Current passing tests are captured in `validation/`, and browser XML inspection rejects the source fixture's unused `[DBNum1]` format as well.

Production-context browser tests exercise UI selection/order/removal, correct text/number/date/blank cells, precision errors and explicit alternatives, both source formats, saved/portable reuse in distant timezones, invalid/stale runs, cancellation/retry, hostile archives and privacy. Context-wide interception starts before navigation, blocks service workers/WebSockets and fails unexpected requests or sentinel diagnostics. IndexedDB checks exclude source values, filenames and formulas. All data is synthetic.

## Resource and responsiveness measurements

Environment: Codex Cloud, Linux x86_64/glibc 2.41, 3 logical CPUs, 9.73 GiB RAM, Node 24.19.0, npm 11.9.0, system Chromium 154.0.8037.57. Measurements include file-picker transport and actual download; repeated trials reuse the worker. They are cloud observations, not the U13 reference-laptop qualification.

| 10,000 rows × 20 columns, Excel download | First | Median of five repeated | Worst repeated |
| --- | ---: | ---: | ---: |
| CSV source | 3,251 ms | 2,113 ms | 3,363 ms |
| XLSX source | 9,035 ms | 3,772 ms | 6,315 ms |

Both outputs contain 200,020 cells with the full independently expected semantic digest. Downloads are about 2.87 MB compressed / 8.25 MB expanded. Maximum observed heartbeat gap is 468.8 ms under the existing 1,500 ms smoke threshold; this is not a claim of sub-100 ms reference-device interaction latency. Exact samples and sizes are in [u10-10000-integrated.json](u10-10000-integrated.json).

All 19 hostile archive variants reject while retaining the prior eligible Excel run, including alternate worksheet routing, encryption, forged lengths, actual-expansion checks, CRC errors, path conflicts, oversized source/ranges/formats and DTD/entities. See [u10-hostile-integrated.json](u10-hostile-integrated.json). New output amplification tests cover 2 million positions and the conservative 100 MiB serialization estimate; row/text limits have dedicated checks. Watchdog/crash recovery remains covered by controller tests; actual browser cancellation also discards pending XLSX bytes and retries the original workflow.

The estimate can reject repetitive/escape-heavy output before 100 MiB actual expansion. These budgets prevent demonstrated amplification paths; they do not constitute a process/heap cap. No source data is silently truncated.

## CE workflow and coverage limits

Native skill invocation was unavailable; the installed `$HOME/.agents/skills/ce-work/SKILL.md` and required references were read and executed. Existing approved U10 planning was reused without rewriting the plan. Six independent CE document-review lenses found no blockers ([receipt](plan-review/receipt.json)). Implementation stayed inline because the single U10 unit shares writer/worker/UI contracts. Simplification applied the shared delimiter-label cleanup; its [receipt](simplification/) records the three review lenses and disposition. The completed full [code review](ce-review/review.json) covers nine lenses at the same implementation commit, with zero actionable findings or testing gaps. Its “Ready to merge” verdict is a code-review result only; it does not authorize merge, deployment or replace hands-on UX acceptance. [Recovery evidence](ce-review/recovery.md) distinguishes recovered reviewer outcomes from rerun scopes after the environment restart.

The optional `ce-test-browser` exploratory driver could not start: no host-native integrated browser or `agent-browser` CLI is installed. Installing that CLI through `ce-setup` would clear its preflight blocker. The repository's existing Playwright production tests and screenshot capture were run separately. Playwright browser downloads are denied by this environment's network policy (`cdn.playwright.dev` returned 403); local Firefox/WebKit execution is unavailable. GitHub's existing three-browser CI supplies that additional coverage when its results are available. No network bypass or replacement dependency was introduced. Cross-provider CE review routes are not installed; review receipts distinguish local coverage from unavailable cross-provider passes.

Screenshots: [desktop](excel-output-desktop.png), [mobile](excel-output-mobile.png). Browser assertions include accessibility and no page overflow. These are automated observations, not the user's UX acceptance.

## Hosted CI follow-up

The first published-head CI run passed all 97 Firefox and 97 WebKit cases. Chromium passed 94/97, timing out in two hostile-download loops and the privacy journey. A local three-repeat affected run reproduced the privacy failure: search remained `note` after an interrupted clear, hiding the Date card. The two-line test repair waits for mapping focus restoration and verifies empty search; no production behavior, assertions or timeout changed. All nine affected repeats then passed. [Diagnosis, red/green logs and trace evidence](ci-focus/README.md) and the focused CE review retain the follow-up. Final hosted results are recorded on the PR.
