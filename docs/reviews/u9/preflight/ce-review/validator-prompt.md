# Validator Batch Prompt Template

Use one fresh validator subagent for one batch of already-merged findings. Eight findings is the normal cap. When more than eight P0/P1 findings survive, expand that same batch to include every surviving P0/P1; never omit a blocker or split the work into another batch. The validator is independent of the originating reviewers and the orchestrator. Fill `/tmp/compound-engineering-1000/ce-code-review/20261017-153732-guard` with the review's run directory; the orchestrator waits on the verdicts file there, so the file, not the in-band return, is the contract.

```
You are the independent validation gate for the code-review findings below. Evaluate every finding separately under fresh inspection and under the shared protected-subject policy below. Outside a protected subject, false positives are common; reject a finding when the cited code does not prove it, it predates and is unaffected by this diff, surrounding code handles it, or it is only an unsupported preference. Inside a protected subject, a rejection requires one of the evidence forms the policy names.

Do not let one finding's outcome influence another. Do not invent new findings.

<findings-to-validate>
[
  {
    "#": 1,
    "autofix_class": "gated_auto",
    "confidence": 100,
    "evidence": [
      "src/formats/archive-budget.ts:334 --   return metrics;",
      "src/formats/archive-budget.ts:332 --     await new Promise<void>((resolve) => setTimeout(resolve, 0));",
      "src/formats/archive-budget.ts:317 --     cancelled();",
      "Read-only Node 24 reproduction using workbook('') and an AbortController aborted in the eighth/final setTimeout callback returned {\"resolved\":true,\"aborted\":true,\"yields\":8,\"entries\":8}."
    ],
    "file": "src/formats/archive-budget.ts",
    "first_evidence": "src/formats/archive-budget.ts:334 --   return metrics;",
    "independent_reviewers": [
      "reliability"
    ],
    "line": 334,
    "owner": "downstream-resolver",
    "pre_existing": false,
    "requires_verification": true,
    "reviewers": [
      "reliability"
    ],
    "severity": "P2",
    "suggested_fix": "Call cancelled() after the per-member await (or immediately before return metrics), and add a regression that aborts during the last member's timer yield and expects rejection.",
    "title": "Recheck cancellation after the final member yield",
    "why_it_matters": "A caller can receive successful preflight metrics even though its AbortSignal was aborted before preflight completed. The last member yields to the event loop after its final cancellation check, then returns without checking again; a caller awaiting this guard can therefore start parser work after cancellation. Checking the signal after that yield closes this explicit asynchronous cancellation window."
  },
  {
    "#": 2,
    "autofix_class": "manual",
    "confidence": 100,
    "evidence": [
      "src/formats/archive-budget.ts:47 --   for (const m of xml.matchAll(/\\bformatCode\\s*=\\s*[\"']([^\"']*)[\"']/g))",
      "Constructed a workbook with xl/styles.xml containing formatCode=\"0' followed by 300 zero characters and a closing double quote. Production preflight accepted it and returned eight verified entries with matching declared/actual expansion.",
      "The regex captures only 0, and line 48 therefore measures one character instead of the complete 302-character value. docs/decisions/excel-fidelity.md requires format-code length to be bounded before parsing."
    ],
    "file": "src/formats/archive-budget.ts",
    "first_evidence": "src/formats/archive-budget.ts:47 --   for (const m of xml.matchAll(/\\bformatCode\\s*=\\s*[\"']([^\"']*)[\"']/g))",
    "independent_reviewers": [
      "adversarial"
    ],
    "line": 47,
    "owner": "downstream-resolver",
    "pre_existing": false,
    "requires_verification": true,
    "reviewers": [
      "adversarial"
    ],
    "severity": "P2",
    "suggested_fix": "Read complete attributes with a quote-aware XML start-tag tokenizer, or at minimum capture the opening quote and require the matching closing quote for formatCode. Enforce the cap on the complete decoded attribute value and add over-limit tests containing each opposite quote character.",
    "title": "Opposite quote bypasses the number-format length guard",
    "why_it_matters": "A number-format attribute longer than the mandatory 256-character cap passes the preflight when it contains an apostrophe inside double quotes. The regex ends the captured value at either quote character rather than its opening delimiter, so the unchanged archive can reach the future reader with an unbounded format that the guard claims to reject. Matching paired delimiters restores the established pre-parser limit."
  },
  {
    "#": 3,
    "autofix_class": "manual",
    "confidence": 100,
    "evidence": [
      "src/formats/archive-budget.ts:82 --   for (const m of xml.matchAll(/\\b(?:ref|sqref)\\s*=\\s*[\"']([^\"']+)[\"']/g))",
      "Constructed a workbook using the independent workbook() generator with A2 inline text <t>ref=\"ORDER-123\"</t> and valid dimension A1:A2. Directly executing production preflight under Node 24 returned Invalid worksheet address, despite no invalid structural address.",
      "The matched cell text is passed to rangeCells at lines 83-84, whose coordinate regex rejects ORDER-123 before any import can proceed."
    ],
    "file": "src/formats/archive-budget.ts",
    "first_evidence": "src/formats/archive-budget.ts:82 --   for (const m of xml.matchAll(/\\b(?:ref|sqref)\\s*=\\s*[\"']([^\"']+)[\"']/g))",
    "independent_reviewers": [
      "adversarial"
    ],
    "line": 82,
    "owner": "downstream-resolver",
    "pre_existing": false,
    "requires_verification": true,
    "reviewers": [
      "adversarial"
    ],
    "severity": "P2",
    "suggested_fix": "Tokenize actual XML start tags and inspect ref/sqref only in their attributes, excluding element text, comments, CDATA and processing instructions. Add a synthetic inline-string regression containing ref=\"ORDER-123\" that passes while the same value in an actual dimension attribute fails.",
    "title": "Ordinary reference text makes an entire workbook fail",
    "why_it_matters": "A valid worksheet containing literal text ref=\"ORDER-123\" is rejected as an invalid worksheet address. The guard scans all XML text for apparent attributes, so customer cell contents become structural range declarations and prevent import. Restricting range inspection to real XML start-tag attributes preserves the structural limit without interpreting source values as metadata."
  },
  {
    "#": 4,
    "autofix_class": "gated_auto",
    "confidence": 100,
    "evidence": [
      "src/formats/archive-budget.ts:87 --     for (const m of xml.matchAll(/<(?:\\w+:)?(?:dimension|c|row)\\b[^>]*>/g)) {",
      "src/formats/archive-budget.ts:51 --     /<(?:\\w+:)?(?:Override|Default|Relationship)\\b[^>]*>/g,",
      "Read-only Node 24 reproduction: preflight(workbook('', {extra: {'xl/worksheets/sheet1.xml': '<worksheet>' + '<c '.repeat(n)}})) took 277.8 ms at n=10000, 983.0 ms at n=20000, and 3741.5 ms at n=40000; largest archive was 2410 bytes with 122777 total expanded bytes."
    ],
    "file": "src/formats/archive-budget.ts",
    "first_evidence": "src/formats/archive-budget.ts:87 --     for (const m of xml.matchAll(/<(?:\\w+:)?(?:dimension|c|row)\\b[^>]*>/g)) {",
    "independent_reviewers": [
      "performance"
    ],
    "line": 87,
    "owner": "downstream-resolver",
    "pre_existing": false,
    "requires_verification": true,
    "reviewers": [
      "performance"
    ],
    "severity": "P2",
    "suggested_fix": "Replace unbounded tag-tail matching in both package and worksheet tag scans with a forward-only scanner that rejects a new '<' before the current tag closes, or minimally use `[^<>]*>` instead of `[^>]*>` and explicitly reject malformed unterminated tags. Add a hostile fixture with repeated unterminated cell/package tag prefixes and verify processing stays bounded before parser dispatch.",
    "title": "Bound XML tag scanning against quadratic malformed input",
    "why_it_matters": "A roughly 2.4 KiB ZIP with a 120 KiB worksheet containing repeated unterminated `<c ` prefixes makes preflight spend several seconds synchronously scanning XML; larger inputs within the resource budget grow quadratically. The tag regex retries its unbounded tail at every prefix, so expansion and cell limits do not prevent this CPU exhaustion and AbortSignal cannot interrupt the scan. Direct calls to the new preflight measured approximately 278 ms, 983 ms and 3742 ms for 10,000, 20,000 and 40,000 prefixes respectively."
  },
  {
    "#": 5,
    "autofix_class": "gated_auto",
    "confidence": 75,
    "evidence": [
      "tests/unit/archive-budget.test.ts:34 --   setTimeout(() => during.abort(), 0);",
      "tests/unit/archive-budget.test.ts:35 --   await expect(pending).rejects.toThrow(/cancel/i);",
      "src/formats/archive-budget.ts:304 --       const abort = () => { void reader.cancel().catch(() => {}); };",
      "src/formats/archive-budget.ts:308 --           const { value, done } = await reader.read();",
      "src/formats/archive-budget.ts:274 --       cancelled();",
      "src/formats/archive-budget.ts:313 --         signal?.removeEventListener(\"abort\", abort);",
      "Read-only instrumentation of the native stream confirmed the timer can abort during an active first-member read, but the current assertion observes only the final error and does not distinguish cancellation of that read from its ordinary completion followed by cancelled()."
    ],
    "file": "tests/unit/archive-budget.test.ts",
    "first_evidence": "tests/unit/archive-budget.test.ts:34 --   setTimeout(() => during.abort(), 0);",
    "independent_reviewers": [
      "testing"
    ],
    "line": 34,
    "owner": "downstream-resolver",
    "pre_existing": false,
    "requires_verification": true,
    "reviewers": [
      "testing"
    ],
    "severity": "P2",
    "suggested_fix": "Extend the cancellation tests with a temporarily stubbed global DecompressionStream whose readable keeps a read pending until cancelled. Abort after the read starts, assert that its cancel handler runs and preflight rejects without supplying another output chunk, and restore the global in finally. Verify the abort listener is removed on success and decompression failure using the supplied signal's addEventListener/removeEventListener methods; retain the real native-stream smoke test.",
    "title": "Prove cancellation interrupts an outstanding stream read",
    "why_it_matters": "Cancellation can regress to waiting for the next decompression output without this test failing: the assertion only checks the eventual cancellation error, which the existing cancelled() checks also produce. The new abort listener's purpose is to interrupt an outstanding reader.read(), and neither that interruption nor listener cleanup on success/error is asserted. A controlled stream that holds a read pending would distinguish prompt resource cancellation from eventual rejection after more output arrives."
  }
]
</findings-to-validate>

<diff>
/tmp/compound-engineering-1000/ce-code-review/20261017-153732-guard/full.diff
</diff>

<scope-context>
{"mode": "standalone", "base": "origin/main", "diff_a": "origin/main", "diff_b": null, "pr": {"number": null, "url": null, "title": null, "body": null, "base_ref_name": null, "head_ref_oid": null, "head_ref": null, "base_ref": null, "has_prior_comments": false}, "branch": "feat/u9-metadata-aware-excel-input", "head_sha": "64cbfcb9e881e698c8264962b6d9656c5bd7aafe", "files": "/tmp/compound-engineering-1000/ce-code-review/20261017-153732-guard/files.txt", "diff": "/tmp/compound-engineering-1000/ce-code-review/20261017-153732-guard/full.diff", "tree_is_reviewed_head": true, "untracked_excluded": []}
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

Write the JSON object below to `/tmp/compound-engineering-1000/ce-code-review/20261017-153732-guard/validator-verdicts.json` before you return, then return the same object:
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
```

Repository /workspace/operations-data-cleaner. Scope guard cluster only. Read actual code and inspect all five findings independently; no production edits, subagents or skills.
