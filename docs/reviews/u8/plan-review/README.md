# U8 CE document review and planning intake

The installed `ce-doc-review` workflow ran in non-interactive mode against the approved plan, bounded to U8 text CSV dates and its governing decisions/verification. Native skill invocation is unavailable in this host; the installed skill and required references were read and executed. This evidence was requested by the user's CE workflow and saved by the parent agent's explicit task instruction; the approved PRD and plan were not edited.

## Coverage

| Persona | Why selected | Result |
| --- | --- | --- |
| Coherence | Always required; internal consistency and source traceability | Completed, 0 findings |
| Feasibility | Always required; implementation and failure paths | Completed, 0 findings |
| Design | Contextual paired-card date controls and accessible interaction | Completed, 0 findings |
| Scope guardian | Plan sizing and U8-only delivery boundary | Completed, 0 findings |

Each reviewer received a separately rendered payload containing the full installed persona, CE template/schema, complete source plan, `unified-plan` classification, `docs/PRD.md` origin, no session-settled annotations, and the same bounded scope. All returned valid JSON; the complete responses are saved alongside this file. No reviewer failed. Compound Pack resolution returned no roots, warnings, or errors. The platform has no agent-release primitive; all four child agents returned final results.

Conditional product/security/adversarial personas were not selected: U8 implements an already approved product decision, introduces no architectural abstraction or alternative tradeoff, and handles ordinary explicit date strings within the existing local-processing boundary. Existing privacy invariants are inherited, with privacy/schema/storage correctness reviewed and tested during implementation. This is bounded U8 planning coverage, not a new review of the full product's privacy architecture. No conditional judgment trio was active, so the additional cross-model judgment pass was not activated. The cheap extraction tier and middle-tier overrides follow the installed skill's dispatch preferences; feasibility inherited its parent model.

## Synthesis

All four complete responses contain empty findings, residual risks, and deferred questions. No confidence promotions, deduplication, rejected claims, corrections, proposed edits, or user decisions remain. The approved plan is sufficient for U8; its historical statements withholding implementation authority are superseded by the current explicit user request. Source hashes identify the exact reviewed documents. This document review makes no test-execution claim and does not grant UX acceptance.

## Planning intake / approved-plan reuse

Read the installed `ce-plan` skill and required Phase 0 output/resume references. The named plan already has the unified Product Contract, Planning Contract, concrete U8 unit, Verification Contract, and Definition of Done. Reuse that approved implementation plan in place without authoring, deepening, or expanding it. The current request authorizes execution, and pipeline mode returns to `ce-work` without another menu or approval request. The approved-plan reuse does not invoke plan-authoring/model-elevation phases.

Confidence check passed for the bounded active unit: U7 is merged at base `bad9233bdabb571f493fabdcc8e1ec3f5486c7ef`; strict calendar parsing, three explicit patterns, optional/required blanks, timezone-independent results, contextual UI, versioned schema compatibility, and actual CSV download verification are all covered by the plan and existing project conventions. There are no launch-blocking plan questions. Deferred Excel serial/epoch/input/export work remains U9/U10.

Execute U8 as follows:

1. Add a pure strict calendar parser/formatter using year/month/day integers for `YYYY-MM-DD`, `MM/DD/YYYY`, and `DD/MM/YYYY`; reject impossible dates, malformed widths, unsupported datetime text, and unconfigured interpretations. Apply the existing recipe → explicit trim/date → validation order.
2. Extend finite workflow schema and semantic compatibility validation for date type/source/target settings. Preserve old U2–U7 workflow meaning and enforce strict unknown-property rejection. Optional blanks remain blank; required blanks fail. Date settings must not bypass underlying recipe errors.
3. Put labeled source/target date choices in the existing contextual paired-card controls. Retain revision-safe automatic preview refresh and stale-export blocking; do not infer formats from headers, samples, locale, or browser timezone.
4. Extend unit/calendar and CSV byte goldens, graphical browser dates, multi-timezone checks, saved/portable round trips, privacy interception, and 10,000-row smoke coverage. Run the existing required checks against a production build. Save actual review/test evidence and screenshots in the draft PR.

Proceed with `ce-work` for U8 only. No merge, deployment, U9 implementation, or claim of hands-on UX acceptance is authorized.
