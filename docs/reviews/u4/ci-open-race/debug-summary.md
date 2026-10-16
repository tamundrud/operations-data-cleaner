## Debug Summary

**Problem**: PR #4 CI loaded CSV rows with zero configured outputs in two Chromium journeys.

**Root Cause**: At pre-fix `SavedWorkflows.tsx:96-105`, Open awaited storage without owning a pending state. Workspace upload (`Workspace.tsx:264-276`) remained enabled and `Session.upload` (`controller.ts:105-158`) could begin with no configured workflow. The Open completion then returned on the busy guard, or a subsequent workflow selection invalidated its token. `Session.activate` never ran, leaving zero output columns. Both supplied CI traces and a controlled native-read reproduction confirm the chain.

**Recommended Tests**: Native delayed Open followed by immediate real source chooser; assert disabled conflicting controls, exact independent exported bytes, unchanged saved record. Cover cancelled Open and a missing saved record; synchronize existing async journeys on persistent activation state. Implemented in `persistence.spec.ts` and the existing privacy/portability/performance journeys.

**Fix**: A distinct pending Open state reserves activation, pauses queued preview and session-mutating controls, and clears on activation, failure or New conversion. Open participates in existing abort/generation cleanup. Session/engine/schema remain unchanged.

**Prevention**: The regression was red before the fix because source upload remained enabled. It now verifies user action ordering through a real chooser and the complete resulting CSV, rather than adding timeouts or relying on a fast local storage read.

**Confidence**: High. Exact symptom reproduced with intact storage; final verification is linked in README.

## Post-Fix Quality

**Scope**: `base:00a0bee9be174f244a8441205bac839282eff3e8`; six fix-owned source/test files, clean pre-fix tree. Investigation evidence is separate.

**Simplify**: Scoped behavior-preserving review completed without edits; proof tests preserved.

**Review**: Focused CE correctness and independent local adversarial read; no findings. Cross-model transport unavailable before egress; actual coverage retained in review receipt.

**Residuals**: None in the focused correction. Existing operator/reference-laptop limitations remain.

**Re-verification**: Typecheck, lint, 93 unit tests, production build and all affected browser tests pass; full-suite/remote CI results are linked in README and PR #4.
