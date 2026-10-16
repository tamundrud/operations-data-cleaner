
You are the independent validation gate for the code-review findings below. Evaluate every finding separately under fresh inspection and under the shared protected-subject policy below. Outside a protected subject, false positives are common; reject a finding when the cited code does not prove it, it predates and is unaffected by this diff, surrounding code handles it, or it is only an unsupported preference. Inside a protected subject, a rejection requires one of the evidence forms the policy names.

Do not let one finding's outcome influence another. Do not invent new findings.

<findings-to-validate>
[
  {
    "#": 1,
    "autofix_class": "gated_auto",
    "confidence": 100,
    "evidence": [
      "src/ui/MappingRows.tsx:854:               {field.recipe?.kind === \"calculate\" ? (",
      "git show HEAD:src/ui/MappingRows.tsx | wc -l reports 835; wc -l src/ui/MappingRows.tsx reports 1121.",
      "src/ui/MappingRows.tsx:734 begins the column settings dialog; its recipe/type/validation UI continues through line 1085, inside the same MappingRows function that owns matching, suggestions and ordering."
    ],
    "file": "src/ui/MappingRows.tsx",
    "first_evidence": "src/ui/MappingRows.tsx:854:               {field.recipe?.kind === \"calculate\" ? (",
    "independent_reviewers": [
      "maintainability"
    ],
    "line": 854,
    "owner": "downstream-resolver",
    "pre_existing": false,
    "requires_verification": true,
    "reviewers": [
      "maintainability"
    ],
    "severity": "P1",
    "suggested_fix": "Extract the column-settings dialog body, including recipe mode initialization, fixed-value editing, output type and validation controls, into a ColumnSettings component receiving the selected field, source columns and field update/match callbacks. Keep dialog focus/lifecycle and matching workspace state in MappingRows; retain CalculationSettings and NumericSettings as its existing child controls. This moves a coherent editing responsibility out of the oversized workspace without adding a generic registry or duplicating recipe logic.",
    "title": "Extract column settings before MappingRows crosses 1,000 lines",
    "why_it_matters": "This diff grows MappingRows from 835 to 1,121 lines. The component now combines drag/drop matching, suggestions, ordering, modal lifecycle, recipe creation, fixed-value editing and numeric policy transitions in one function. Adding calculation support expands the embedded settings branch even after extracting CalculationSettings, so changes to any recipe still require navigating the entire matching workspace and its captured state."
  },
  {
    "#": 2,
    "autofix_class": "manual",
    "confidence": 75,
    "evidence": [
      "src/ui/MappingRows.tsx:962:                       if (e.target.value) match(field.id, e.target.value);",
      "src/ui/MappingRows.tsx:150:     update(id, { type: \"text\", recipe: { kind: \"copy\", source: key } });",
      "src/ui/MappingRows.tsx:126-130: patch.type === \"text\" clears rounding, scale and wholeNumber in update().",
      "src/ui/MappingRows.tsx:978-987: Copy outputs now expose an independent Output type selector, including Number.",
      "src/engine/recipes.ts:196-199: Numeric validation is conditional on f.type === \"number\".",
      "src/ui/MappingRows.tsx:128: rounding: undefined,; src/ui/MappingRows.tsx:129: scale: undefined,; src/ui/MappingRows.tsx:130: wholeNumber: undefined,; src/ui/MappingRows.tsx:150: update(id, { type: \"text\", recipe: { kind: \"copy\", source: key } });",
      "Configure a copy from source A as number with wholeNumber=true, then choose source B through the Copy source selector. Its onChange invokes match(field.id, e.target.value), which supplies type=text; the new update branch deletes all numeric policies.",
      "If B contains 1.5 or 'four', recipes.ts skips numeric validation because f.type is now text, leaving an optional destination valid and exportable. This crosses the source-selection/editor boundary into numeric validation and can silently change a saved workflow's business rule."
    ],
    "file": "src/ui/MappingRows.tsx",
    "first_evidence": "src/ui/MappingRows.tsx:962:                       if (e.target.value) match(field.id, e.target.value);",
    "independent_reviewers": [
      "adversarial",
      "correctness"
    ],
    "line": 962,
    "owner": "downstream-resolver",
    "pre_existing": false,
    "requires_verification": true,
    "reviewers": [
      "adversarial",
      "correctness"
    ],
    "severity": "P2",
    "suggested_fix": "Preserve an existing copy field's output type, wholeNumber, scale and rounding when selecting or replacing its source; reserve incompatible-policy clearing for an explicit output-type or recipe-mode transition. Add a regression scenario that configures a numeric copy before and after source selection, remaps it to fractional and nonnumeric data, and verifies the rules and invalid-row/export behavior remain intact.",
    "title": "Preserve numeric settings when changing a copy source",
    "why_it_matters": "A user can configure a copied output as Number with whole-number, scale and rounding rules, then change its Copy source dropdown. The dropdown calls match(), which always sets type to text; the new update logic also removes all numeric settings. The replacement source now bypasses numeric validation and exports as text, so a fractional or malformed value that should be invalid can become eligible without an explicit change to the output type or validation controls. The same reset is reachable when configuring Number before choosing the first copy source."
  }
]
</findings-to-validate>

<diff>
/tmp/compound-engineering-1000/ce-code-review/20261016-142646-122044e8/full.diff
</diff>

<scope-context>
{"mode": "standalone", "repo": "/workspace/operations-data-cleaner", "tree_is_reviewed_head": true, "reviewed_snapshot": "full.diff and current source; reviewed working tree is staged on head_sha, not the clean HEAD tree", "remote_refs": null}
</scope-context>

<protected-subject-policy>
Return status "confirmed", "rejected", or "unresolved". Never use lack of disproof as evidence of confirmation.

Set protected_subject to the best-fitting key below, or JSON null when none applies:
- memory-safety: allocation sizes, buffer lengths, index bounds, use-after-free, invalid memory access, or null dereferences.
- concurrency: locks, atomics, data races, ordering, or synchronization whose failure can affect observable behavior.
- data-loss: destructive writes, deletes, truncation, overwrite-in-place, or irreversible migrations and backfills.
- authorization-authentication: identity, permissions, ownership, session/token handling, or privilege boundaries.
- injection: attacker-influenced or untrusted data that can alter SQL, commands, templates, paths, or markup across a trust boundary, including stored input. Text assembly alone is not proof.
- public-contract: an evidenced compatibility concern involving an externally consumed response field, status code, error path, default, message, or published signature. An internal export or intentional contract change alone is not a defect.
- secrets-exposure: hardcoded credentials, API keys, tokens, or private keys in source or configuration; credentials, session tokens, or personal data written to logs, error messages, URLs, or responses; secrets committed to a repository or shipped in a built artifact.
- cryptography: weak or broken algorithms and modes, a fast general-purpose hash used for passwords, static or predictable keys, salts, or IVs, disabled certificate or signature verification, insufficient randomness, or a misused primitive whose failure breaks a security guarantee.

For every subject, confirm only when inspected evidence establishes the issue, the diff introduces or newly exposes it, and surrounding code or applicable runtime guarantees do not prevent it.

A finding that is real in the code may still describe a state that never occurs. For every finding, name the precondition the defect needs (the input, data shape, or ordering) and say what would show it occurs or is reachable: a test, a query against available data, a caller that produces it. When that evidence is in reach with the budget, obtain it; when it is not, confirm on the code alone and state in `reason` that incidence was not measured. Unmeasured incidence does not lower confidence or block confirmation; it is what the reader needs to weigh the severity.

Treat a finding as protected when the actual failure it alleges falls within a subject above. Read its category, title, and body together; keywords only prompt inspection and never establish protection. A naming preference about a token helper is not a token-handling defect. Your classification cannot remove protection established by the claim; the consumer applies this test independently.

On a protected subject, reject only by citing specific evidence that refutes the claim or establishes that it is unrelated pre-existing behavior: quote the file and line number that refutes it, name the version-specific or configuration-specific documentation and the version in force, give short-hash provenance, or cite a discriminating test result. Test evidence must identify the reviewed revision, engine/runtime version, configuration, exercised trigger, assertion, and observed result, and explain why it disproves the exact claim. A general passing suite or a test that did not exercise the alleged trigger is not disproof. An assumed framework guarantee is not evidence. Without one of these evidence forms, return status "unresolved", not "rejected". Inspect existing test evidence or use a read-only reproduction within your authority; do not mutate files or application state to obtain it.

If a protected claim remains uncertain, return status "unresolved" and state the missing evidence. Low confidence alone does not justify rejecting or confirming it.

Outside protected subjects, keep the ordinary conservative evidence bar: after inspection, reject an unsupported claim and explain why. Missing required inspection is different from inspected-but-unsupported evidence. If the cited file or required context cannot be accessed, return status "unresolved" for any subject, state the access limit, and do not guess.

Classify the claim itself, not its title. Never raise severity or confidence to preserve it. Do not invent findings or propose that uncertainty is a confirmed defect.
</protected-subject-policy>

For local-aligned scope, inspect the cited files, callers, guards, project contracts, and targeted history with read-only tools. For pr-remote or branch-remote scope, use the provided diff and reviewed head ref, never the unrelated workspace copy.

Budget: the batch has 15 minutes of wall clock and about five tool calls per finding. Inspect findings in the order given. When the budget runs out, stop inspecting and give every remaining finding `"status": "unresolved"` with the reason `budget exhausted, uninspected`; never guess a verdict you did not inspect.

Write the JSON object below to `/tmp/compound-engineering-1000/ce-code-review/20261016-142646-122044e8/validator-verdicts.json` before you return, then return the same object:
{
  "verdicts": [
    {
      "#": <input stable number>,
      "status": "confirmed" | "rejected" | "unresolved",
      "protected_subject": "<one of the eight policy keys>" | null,
      "reason": "<one sentence grounded in inspected evidence, or naming the evidence you could not obtain>"
    }
  ]
}

Each entry carries exactly those four fields. Return one verdict for every input # exactly once; unknown, duplicate, or missing numbers and invalid status or subject values are malformed output. Do not emit the legacy `validated` boolean. No prose outside JSON. Writing the verdicts file above is the one permitted write; do not edit project files, commit, push, or otherwise mutate the checkout.

Read the full.diff path selectively plus cited source. Repo /workspace/operations-data-cleaner. No browser/server/build/test runs or project mutations. Leaf: do not delegate.
