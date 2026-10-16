# U5 simplification — efficiency review

Reviewed the U5 diff against `origin/main`, including the new suggestion matcher/dictionary and unit/browser tests. This pass is read-only for implementation code.

## Finding

- **Low — `src/ui/MappingRows.tsx:59–61`: repeated allocation and linear membership scans.** Each unmatched output creates the same source-header array, then checks every source column with `headers.includes`. With many ambiguous candidates this adds quadratic column membership work per output on every render, including search and drag state changes. Compute the source-header array once before the output loop and convert each returned candidate list into a `Set`, then use `headers.has(c.header)`. This preserves source ordering, duplicate-header behavior, rejection keys, and explicit confirmation while reducing membership work to linear time per output. No matcher API or recipe changes are needed.

## Otherwise sound

The matcher operates only on headers, uses bounded curated equivalence groups, and performs no network or record scans. Configured fields do not undergo matching. The change adds no timers, subscriptions, persistent caches, or asynchronous resource lifecycles. No additional worthwhile concurrency, cleanup, or broad-operation findings were identified. Tests were inspected, not executed by this review-only pass; implementation validation belongs to the parent workflow.
