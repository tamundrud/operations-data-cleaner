# Excel feasibility gate (U1)

Date: 2026-10-11. Scope: the early gate in the approved [implementation plan](../plans/2026-10-11-1607-feat-operations-data-cleaner-plan.md), governed by PRD FR-36/41/47 and KTD-04/07. This qualifies an approach; it does not implement or release Excel support.

## Decision

Use **SheetJS Community Edition 0.20.3**, pinned to the official tarball, with raw numeric date serials and metadata-aware cell reads. Use a bounded ZIP preflight before giving the **unchanged, verified archive** to SheetJS. Prefer native browser `DecompressionStream("deflate-raw")`; **fflate is not required in the application**. No archive reconstruction is needed for the qualified ZIP profile.

Direct SheetJS, or SheetJS preceded only by a file-size check/watchdog, is insufficient. The source trusts local-header sizes, inflates ZIP members before worksheet limits, and does not verify CRC. The probes accepted a forged-small length, duplicate member and corrupted CRC; `sheetRows: 10` silently limited a 10,000-row worksheet. It must not be used as a resource safeguard.

The qualification prototype validates central/local names, flags, sizes, checksums, extra fields, descriptors and nonoverlapping indexed payload ranges. It rejects conflicting paths, encryption, unsupported compression and ZIP64. It streams compressed input in 1 KiB slices, counts **actual** expanded bytes before retaining them, checks CRC and lengths, and bounds worksheet cell/range references and format-code length before parsing. It follows XML package declarations, inspects references in every XML member regardless of path, and rejects XML parser routing to skipped non-XML paths. It checks every member, including unselected sheets, because SheetJS expands the complete ZIP. Rebuilding the ZIP would duplicate validated data and introduce a second package writer without closing an identified gap.

Native streaming and fflate streaming pass the same fidelity/hostile fixtures. Native streaming avoids an additional production dependency and exposes backpressure/cancellation. fflate whole-member inflation allocates all 8 MiB of the compression probe before its callback; 1 KiB pushes reduced the largest callback to 1,056,768 bytes. fflate 0.8.3 is suitable for synthetic fixture generation and the comparison, not necessary for production preflight. Do not use whole-member `unzipSync`/inflate on untrusted input.

## Cell, date and formula contract qualified

- Read `t`, `v`, `w`, `z`, `f` and workbook `date1904`; use `cellNF:true`, `cellText:true`, `cellFormula:true`, `cellDates:false`, `sheetStubs:true`, `cellHTML:false`, and a selected worksheet. Preserve raw metadata separately from interpreted results. No flattening through `sheet_to_json`.
- Text `001234` and boundary spaces remain literal. Numeric `1234` under `000000` displays `001234`. Preserve raw numeric values for arithmetic, display text for supported identifier copying. Long numeric identifiers and unsupported `[DBNum1]General` formatting retain evidence for warnings; no recovery of lost digits is claimed. Error and boolean types remain distinct.
- Both 1900/1904 epochs and leap boundaries are inspectable. Interpret calendar components from serials with the explicit epoch; do not convert through local JavaScript dates. Reject the fictitious 1900-02-29, invalid/negative/out-of-calendar serials and a time component for date-only interpretation. Serial zero in the 1904 system is 1904-01-01; the 1900 day-zero result is invalid. Two distant browser timezones produce identical interpreted results.
- Cached numeric and string formulas retain formula provenance, including shared formulas. Missing or error caches are unusable. Usable caches must carry stale-cache warnings downstream; the harness demonstrates the classification, not production validation UI. Neither `WEBSERVICE` nor external hyperlinks trigger a request. No HTML rendering or hyperlink activation occurs.
- Write a new workbook with explicit literal string/numeric cells and deliberate date serial/format. Independent ZIP/XML inspection verifies leading zeros, formula-like literal text, column order, blanks, numeric `0.3`, date serial `45352`, no `<f>` elements, and no copied external relationships. Numeric precision that cannot survive XLSX representation must fail with CSV/text alternatives. The qualification probes demonstrate conservative 15-significant-digit/lexical checks and reject over-precision examples; the complete decimal/date export adapter remains U10's responsibility.

The independent CE review found that a filename-based worksheet check could be bypassed by a valid alternate relationship target (`xl/custom.xml`). A scratch probe showed the unsafe range passed preflight; an added regression failed with “Missing expected rejection.” The corrected preflight inspects all XML member references and validates XML content-type/relationship routing. Both decoder paths must reject these hostile cases before `parse-start`; a benign alternate XML worksheet remains supported. No dangerous 17-billion-cell parse was executed.

## Reproduction and evidence

The [isolated harness](../../tests/qualification/xlsx/README.md), [guarded results](../../tests/qualification/xlsx/results.json), and [direct-reader baseline](../../tests/qualification/xlsx/baseline-results.json) contain exact commands, per-fixture observations, output XML, resource counts, request records and environment. `npm audit` reports zero known vulnerabilities for the pinned tree; this is supplemented by manual advisory/provenance review, not treated as proof of safety.

Only synthetic OOXML was generated. A fixed local static server, context-wide request interception, blocked service workers, CSP, request URL/header/body checks, diagnostic sentinel checks and a real browser worker were used. The tests exercise file bytes and actual workbook XML, not snapshots or mocked library responses. Source files are not sent through HTTP.

The representative fixture is 796,141 compressed bytes / 8,097,089 actual expanded bytes. Its selected table has exactly 10,000 data rows × 20 columns plus headers (200,020 cells); the archive also contains a separate two-cell sheet, which is budgeted but not merged. Native preflight reports a maximum expanded chunk of 10,629 bytes for this workbook. The provisional 25 MiB / 100 MiB / 2 million-cell budgets do not exclude it.

Measured environment: Ubuntu 24.04, Node 22.23.2 / npm 10.9.8, Intel i9-13900H, 20 logical CPUs, approximately 31 GiB RAM; Chromium 156.0.8078.4, Firefox 157.0, WebKit 27.2 through Playwright 1.64.0. These are installed test engines, not a claim to have measured the release's reference laptop or public deployment. Each benchmark records one first workbook run and five further runs; every request creates a fresh worker, so these are repeated trials with warmed browser asset caches, not a reused-worker benchmark. Full import/process/preview/correction/export timing remains an integrated qualification.

| Browser | First run | Median of five further runs | Worst further run |
| --- | ---: | ---: | ---: |
| chromium 156.0.8078.4 | 738.3 ms | 729.4 ms | 742.8 ms |
| firefox 157.0 | 733.0 ms | 732.0 ms | 743.0 ms |
| webkit 27.2 | 672.0 ms | 668.0 ms | 676.0 ms |

All 87 guarded test groups passed; all 33 direct-reader characterization groups passed. The Chromium renderer RSS sample peak across the entire qualification run was 621.8 MiB (including transport, hostile fixtures and repeated workers); this is neither per-workbook peak heap nor a guaranteed bound.

## Dependency provenance and advisories

| Candidate | Source/license | Result |
| --- | --- | --- |
| SheetJS CE 0.20.3 | [Official installation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), official CDN tarball, Apache-2.0 | Recommended; lockfile records SHA-512 integrity. Public npm `xlsx` 0.18.5 is not adopted. |
| fflate 0.8.3 | [Official repository](https://github.com/101arrowz/fflate), npm registry integrity, MIT | Qualified comparison and synthetic ZIP generator; development only. |
| Playwright 1.64.0 | [Official repository](https://github.com/microsoft/playwright), npm registry integrity, Apache-2.0 | Qualification tooling only. |
| Native DecompressionStream | Browser runtime, no package version | Qualified in the three recorded engines; unsupported browsers must get an actionable capability error. |

Manual checks: [CVE-2023-30533](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) affects SheetJS before 0.19.3; [CVE-2024-22363](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) affects before 0.20.2. [CVE-2026-45820](https://github.com/advisories/GHSA-px8p-9vwx-vf98) affects fflate before 0.8.3. The [Open WebUI spreadsheet HTML advisory](https://github.com/advisories/GHSA-jwf8-pv5p-vhmc) reinforces avoiding generated spreadsheet HTML. Recheck advisories at U9 introduction and release. Installed packages retain their license files; preserve third-party licenses/notices when bundling the application.

## Limits and remaining obligations

This is a deliberately bounded ZIP/OOXML profile, not a universal archive parser. ZIP64, encrypted/multidisk archives, unsafe/conflicting paths, unsupported flags/compression, oversized formats/ranges and XML DTD/entities produce actionable failures. The probe currently requires file-only ASCII package paths, standard workbook parts and explicit cell references; ordinary Excel/LibreOffice and streaming-writer interoperability needs broader golden fixtures before production adoption. Unsupported display formats are warnings, not claimed exact reproductions of every Excel rendering. Cached formulas may be stale; no formula evaluator is introduced.

100 MiB expanded data is **not a 100 MiB process/heap cap**. ZIP content, XML strings and SheetJS objects coexist; worker isolation is not a memory sandbox. The results record sampled Chromium renderer RSS, not a guaranteed peak allocation ceiling. Hard source/entry/actual-expansion/range/format limits prevent the demonstrated declared-size and expansion attacks; a watchdog terminates remaining long processing. Stress near resource boundaries, fuzz malformed OOXML, verify native browser behavior across supported versions, and repeat the guard against the integrated worker in U9/U10. Release limits must be measured on the proposed 8 GiB reference laptop. No network/private-data or certified TMS interoperability claim follows from this gate.

U2 must implement its own first-slice production privacy and responsiveness tests. U9 must adapt this prototype narrowly, preserve supplemental raw cell metadata where needed, surface exact limits/remediation without truncation, and repeat the fixtures before enabling XLSX. U10 must complete typed numeric/date serialization and independent XML checks. U13 must perform full acceptance and reference-device qualification.

**Gate outcome:** the bounded feasibility approach satisfies U1's cell-fidelity, date, formula-safety and resource-protection evidence conditions. U2 is ready for separately authorized implementation. No U2 work or deployment is included.

## U9 dependency introduction (2026-10-17)

The official tarball is now accessible (HTTP 200, 2,409,319 bytes). Its SHA-512 exactly matches U1's committed qualification lockfile: `sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==`. The unchanged archive is vendored at `vendor/xlsx-0.20.3.tgz`, installed through a local file reference with the same lockfile integrity, and bundled in the processing worker. Apache-2.0 is retained in the tarball, `vendor/SheetJS-LICENSE.txt`, and the distributed static `SheetJS-LICENSE.txt` asset.

Manual advisory recheck retrieved GHSA-4r6h-8v6p-xvw6 and GHSA-5pgg-2g8v-p4x9 on 2026-10-17; their affected ranges remain before 0.19.3 and before 0.20.2 respectively. The pages' public-npm patched-version field says “None”; this does not identify the current official CDN release as affected. `npm audit` reports zero known vulnerabilities for the introduced tree; this is supplemental evidence, not a safety guarantee.

U9 uses the preflight implementation and review evidence preserved at commit `81f74a2` unchanged. Every discovery/import first validates the complete original archive. Multiple sheets require selection; saved workflows reuse the explicit worksheet name and reject a missing sheet. Templates have independent sheet selection and import names/order only. The explicit “Excel date cell” setting interprets date-formatted numeric cells with their workbook calendar, rejecting serial 60/zero in 1900, fractions, negative and out-of-calendar values. Raw metadata remains inspectable; formulas are never evaluated and referenced usable caches carry stale warnings. Missing/error caches invalidate dependent output, including optional fields. Only actual formula-like output text requires the CSV escape/raw decision.

See `docs/reviews/u9/verification.md` for integrated-worker verification, screenshots, exact environment and remaining acceptance limits. XLSX output remains U10; reference-laptop and final release qualification remain U13.
