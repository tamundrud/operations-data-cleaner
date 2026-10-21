# Staged source corrections and exception causes

Issue #14 extends the existing browser-only correction model without changing workflow version 1.

Raw engine diagnostics remain authoritative for row validity, warning/error counts and export eligibility. Runtime cause identities carry structured source/operand or workflow-rule targets. The review projection groups shared failures and suppresses only required-blank presentation symptoms linked to upstream errors; it never deletes raw issues or groups by message text.

Session owns pending corrections separately from the accepted correction overlay. A worker batch validates every coordinate and evaluates a candidate overlay once before committing it. Session promotes its recovery overlay only on the matching successful response. Cancellation, failure and stale responses retain pending edits and the previous accepted source state. Pending edits block download; applying them revokes prior export choices and acknowledgement.

Source and output queries have independent filters and pages. Source queries select from the full dataset before slicing. Corrected row IDs remain visible for confirmation until explicit source navigation; a navigation sequence distinguishes deliberate focus requests from revalidation so applying a batch does not move the operator away.

Original raw/display/Excel metadata stays in the in-memory source and existing original-cell overlay. Runtime causes, pending edits and query state never enter workflow JSON or IndexedDB. Regression evidence is in `docs/reviews/issue-14/`.
