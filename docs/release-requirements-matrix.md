# Requirements-to-evidence matrix (U13)

Evidence is automated Cloud verification, not final release acceptance. Test names below refer to `tests/e2e/<name>.spec.ts`. See [run results and limitations](reviews/u13/verification.md). Existing unit suites provide engine, byte and schema failure coverage in addition to these browser journeys.

| Acceptance | Contract | Executable evidence | Remaining qualification |
| --- | --- | --- | --- |
| AC-01 | Graphical mapping/order | [row-mapping](../tests/e2e/row-mapping.spec.ts), [conversion](../tests/e2e/conversion.spec.ts) | Cross-browser/final acceptance pending |
| AC-02 | Confirmed suggestions | [suggestions](../tests/e2e/suggestions.spec.ts) | Cross-browser/final acceptance pending |
| AC-03 | Strict split | [address-recipes](../tests/e2e/address-recipes.spec.ts) | Cross-browser/final acceptance pending |
| AC-04 | Ordered combine | [address-recipes](../tests/e2e/address-recipes.spec.ts) | Cross-browser/final acceptance pending |
| AC-05 | Source division | [calculations](../tests/e2e/calculations.spec.ts) | Cross-browser/final acceptance pending |
| AC-06 | Constant arithmetic | [calculations](../tests/e2e/calculations.spec.ts) | Cross-browser/final acceptance pending |
| AC-07 | Fixed values | [constants](../tests/e2e/constants.spec.ts) | Cross-browser/final acceptance pending |
| AC-08 | Identifier fidelity | [excel-input](../tests/e2e/excel-input.spec.ts), [excel-output](../tests/e2e/excel-output.spec.ts) | Cross-browser/final acceptance pending |
| AC-09 | Explicit dates | [dates](../tests/e2e/dates.spec.ts), [excel-input](../tests/e2e/excel-input.spec.ts) | Cross-browser/final acceptance pending |
| AC-10 | Decimal correctness | [calculations](../tests/e2e/calculations.spec.ts) | Cross-browser/final acceptance pending |
| AC-11 | Candidate/blank/footer counts | [conversion](../tests/e2e/conversion.spec.ts), [excel-input](../tests/e2e/excel-input.spec.ts) | Cross-browser/final acceptance pending |
| AC-12 | Schema compatibility | [workflow-portability](../tests/e2e/workflow-portability.spec.ts) | Cross-browser/final acceptance pending |
| AC-13 | Source correction | [correction-reupload](../tests/e2e/correction-reupload.spec.ts), [release](../tests/e2e/release.spec.ts) | Cross-browser/final acceptance pending |
| AC-14 | Safe replacement | [correction-reupload](../tests/e2e/correction-reupload.spec.ts) | Cross-browser/final acceptance pending |
| AC-15 | Acknowledged exclusions | [partial-export](../tests/e2e/partial-export.spec.ts), [release](../tests/e2e/release.spec.ts) | Cross-browser/final acceptance pending |
| AC-16 | CSV bytes | [constants](../tests/e2e/constants.spec.ts), [conversion](../tests/e2e/conversion.spec.ts) | Cross-browser/final acceptance pending |
| AC-17 | Formula safety | [privacy](../tests/e2e/privacy.spec.ts), [excel-input](../tests/e2e/excel-input.spec.ts), [excel-output](../tests/e2e/excel-output.spec.ts) | Cross-browser/final acceptance pending |
| AC-18 | Saved repeats | [persistence](../tests/e2e/persistence.spec.ts), [sample-journey](../tests/e2e/sample-journey.spec.ts) | Cross-browser/final acceptance pending |
| AC-19 | Portable schema | [workflow-portability](../tests/e2e/workflow-portability.spec.ts), [sample-journey](../tests/e2e/sample-journey.spec.ts) | Cross-browser/final acceptance pending |
| AC-20 | Observed local privacy | [privacy](../tests/e2e/privacy.spec.ts), [excel-output](../tests/e2e/excel-output.spec.ts), [partial-export](../tests/e2e/partial-export.spec.ts) | Cross-browser/final acceptance pending |
| AC-21 | 10000-row integrity/responsiveness | [performance](../tests/e2e/performance.spec.ts), [excel-output](../tests/e2e/excel-output.spec.ts) | Reference laptop deferred |
| AC-22 | Visitor demonstration | [sample-journey](../tests/e2e/sample-journey.spec.ts) | Cross-browser/final acceptance pending |

| Plan requirements | PRD requirements | Evidence |
| --- | --- | --- |
| R1 | FR-01–06,35–37 | AC-01,08,11; conversion, excel-input; unit CSV/XLSX and archive tests |
| R2 | FR-07–10,38–39 | AC-01,02,12; row-mapping, suggestions, portability; workflow semantic validation |
| R3 | FR-12–17,40–41,43 | AC-03–10; constants, address-recipes, calculations, dates; integrated release/sample journeys |
| R4 | FR-19–25,44 | AC-11,13–15; correction-reupload, partial-export, release; full-dataset eligibility unit tests |
| R5 | FR-29–34,46 | AC-18,19,22; persistence, workflow-portability, sample-journey; strict schema tests |
| R6 | FR-27–28,45,47 | AC-01,16,17; conversion, constants, excel-output; byte goldens and OOXML inspection |
| R7 | NFR-01–06 | AC-17,20; privacy, hostile Excel, partial-export; storage/JSON validation |
| R8 | NFR-07–10 | AC-11,15,18,19,21; performance, excel-output, correction-reupload; reference qualification deferred |
| R9 | NFR-11–14 | accessibility, row-mapping, partial-export; sample-journey axe/overflow/screenshots; human operator review pending |
| R10 | NFR-15–16; PRD §11 | README, Apache-2.0 LICENSE, notices, release guidance and synthetic assets; same production build/portable workflow; hosting and publication pending |

FR-11, FR-26, FR-42 / AC-23 are deferred SHOULD capabilities under the approved plan. FR-18 is LATER. Every other FR and all NFRs are mapped above; a mapping indicates evidence location, not an unconditional acceptance claim. All AC-01–22 retain final user acceptance as an open gate.
