# U9 bounded preflight checkpoint

This is a partial implementation checkpoint on `feat/u9-metadata-aware-excel-input`, based on main `64cbfcb9e881e698c8264962b6d9656c5bd7aafe`. U9 is **blocked**, not complete. XLSX uploads remain disabled; the approved U2–U8 application behavior is unchanged. No U10 work is included.

## Access checks

On 2026-10-17, the environment proxy denied `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` with HTTP 403 at CONNECT. No cached/local tarball was found. The network policy does not list `cdn.sheetjs.com`. No alternate route was used to bypass that denial.

GitHub CLI reports invalid `GH_TOKEN`, but the connected GitHub integration successfully retrieved `tamundrud/operations-data-cleaner` with push permission. Its PR-creation operation supports `draft: true`. GitHub delivery therefore has a fallback; the approved dependency remains the blocker.

When the official tarball is available, verify SHA-512 against U1's committed qualification lockfile before vendoring it and using a repository-local package reference:

`sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==`

The tarball has not been obtained or vendored. Reader integration, cell metadata, worksheet UI, workflow settings, screenshots, integrated hostile/privacy/performance qualification, draft PR and GitHub CI remain outstanding.

## Implemented and tested

`src/formats/archive-budget.ts` narrowly adapts the qualified native streaming guard: unchanged archive, all-member validation, actual expansion/CRC checks, local/central agreement, descriptors, ZIP64/encryption/path restrictions, entry/range/format budgets and abort support. No production ZIP dependency or archive reconstruction was added. `fflate` 0.8.3 is development-only, to reuse U1's independent synthetic fixtures.

XML inspection walks actual start tags forwards, respects matched quotes, skips text/comments/CDATA/processing instructions, decodes attribute entities and inspects alternate XML paths. It checks namespace-prefixed structural attributes conservatively and rejects ambiguous local-name collisions. This fixes confirmed failures in the prototype's regular expressions without removing the qualified bounds.

Before integration, the reader must still receive only the unchanged archive after successful preflight, within the existing worker/watchdog and revision-safe transaction. A 100 MiB expanded-byte budget is not a heap bound. These Node tests do not establish browser or integrated-worker qualification.

Final checks: Node 24.19.0; `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build` and `git diff --check` pass. The unit suite has 199 passing tests across 18 files, including 33 preflight tests. `npm audit` reports zero known vulnerabilities for the installed tree. All workbook data is synthetic.

Coverage includes U1's hostile ZIPs and alternate worksheet routing, actual expansion, checksums, malformed/encrypted archives, excessive ranges, the 10,000-row × 20-column fixture (200,022 workbook cells including the second sheet), unchanged bytes, cancellation before work/during reads/at the final yield, listener cleanup, complete quoted/decoded format lengths, literal reference-like text and repeated malformed XML prefixes. This is guard qualification only; no integrated import timing is claimed.

## Compound Engineering evidence

The installed `$HOME/.agents/skills/ce-work/SKILL.md` and required references governed this run; native execution was selected. The approved U9 plan and Excel fidelity decision were retained. The previous six-lens document review found no plan blockers and remains applicable.

Three simplification reviewers covered reuse, quality and efficiency. Applied: reuse the sole XML chunk without a second buffer allocation. Skipped: importing the CSV module solely for its size constant would couple the guard to Papa Parse; changing the per-member yield schedule would change the qualified cancellation timing.

The actual completed CE code-review receipt is [ce-review/review.json](ce-review/review.json), run `20261017-153732-guard`, with full reviewer coverage and an independent validation pass. Its historical verdict is “Ready with fixes,” covering only the preflight checkpoint. No different-provider CLI was available; a local adversarial reviewer covered that lens.

Applied findings #1–5 inline:

1. Check cancellation again after the final asynchronous yield.
2. Read complete matched-quote attributes and enforce decoded format lengths.
3. Inspect structural attributes rather than source text.
4. Replace quadratic tag-tail expressions with forward-only scanning.
5. Test interruption of a pending read and abort-listener cleanup.

Six discriminating assertions failed before the fixes. A narrow independent follow-up closed #1–5 and reran all 32 guard tests then present. A final namespace-prefixed-attribute regression subsequently failed before its fix; an independent follow-up found no material regression and reran all 33 guard tests successfully. Both cancellation safeguards were separately removed in temporary mutations; their targeted tests failed, and the original source was restored. The mutation results are retained alongside this file.

The archived receipt describes the originally reviewed source, not full U9 completion. Future integration must repeat review and all mandatory browser qualification before XLSX is enabled. No PR, merge or deployment has occurred at this checkpoint.
