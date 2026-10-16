# PR #4 CI correction: Open workflow before source upload

Scope: focused correction on `feat/u4-save-repeat-backup`, starting at `00a0bee9be174f244a8441205bac839282eff3e8` with a clean tree. Six source/test files belong to this fix; no engine, workflow schema, persistence-format, dependency, plan or U5 changes. Original U4 evidence remains historical.

## Root cause

[Actions run 38792057702](https://github.com/tamundrud/operations-data-cleaner/actions/runs/38792057702) passed 154 browser cases and failed two Chromium cases. The `csv-browser-evidence` artifact (ID 12001810012) was downloaded and both Playwright traces and error snapshots inspected. [CI analysis](ci-failure-analysis.json) retains selected trace timings and the artifact digest; the full synthetic ZIP remains available through the run.

On the original commit, `SavedWorkflows.tsx:96-105` awaited a fresh IndexedDB list without reserving activation. Workspace left source upload enabled. A source arriving during that read called `Session.upload` (`controller.ts:105-158`) before `Session.activate` had installed a workflow. When the saved read completed, `currentProps.current.disabled` could be true because CSV processing was busy, so the Open handler silently returned. The worker imported rows with no workflow. Workspace's draft and controller configuration remained empty: successful CSV load, zero output columns, no preview counts.

A second selection could also invalidate Open's token before activation. In the portability CI trace, JSON import began about 47 ms after Open began, followed by CSV upload; the initial saved workflow was never active. The later deferred-import regression therefore never reached the state it intended to test.

The privacy trace starts upload about 31 ms after the Open click. Repeated unmodified local runs happened to pass (6/6), so timing alone was not treated as a timeout defect. A controlled native IndexedDB success event and held CSV read reproduced the exact state: upload enabled during Open, then empty workflow name, empty mapping and zero preview counts after the read completed while CSV was busy. The stored definition was intact. This rules out corruption or a missing configuration in storage.

## Correction and regression coverage

`SavedWorkflows` reports a dedicated pending Open state to Workspace before awaiting storage. Conflicting source/sample/template, editing, preview scheduling, paging, export, save and workflow-selection actions wait until activation or failure. The Open read now participates in existing AbortController/generation cleanup. New conversion remains available to cancel; old completions cannot restore a discarded conversion. Name edits retain the existing latest-state replacement confirmation.

`Session` and transformation behavior remain unchanged. A valid selected workflow is installed before a new upload can start. Failure or dismissed confirmation releases the controls and preserves the prior conversion; no save or source persistence is introduced.

The regression in `persistence.spec.ts` holds the native Open read, clicks source upload immediately, verifies conflicting controls are disabled, releases the read, then uses the real file chooser. It compares the complete exported CSV with independent exact U3 bytes and verifies the saved record is unchanged. [Pre-fix red result](regression-red.json) shows upload was enabled. Additional cases cover New conversion during Open and a saved record disappearing before read completion, including preservation of the prior downloadable CSV on failure.

The three existing privacy/portability/performance journeys now await the persistent Repeat workflow region and enabled upload control before their next action. No timeout increased. An intermediate run used transient status text (45 passed / 3 failed); its snapshots showed correct activated workflows but the library refresh had cleared that status. [Intermediate result](targeted.json) is retained; persistent-state assertions replace that unsuitable synchronization.

## Verification

Node 24.21.0, Playwright 1.64.0. `npm run typecheck`, `npm run lint` and `npm run test:unit` pass (93 tests, 12 files); production build passes. [Affected suites](affected-green.json): 54/54 across Chromium, Firefox and WebKit, no failures, skips or flaky retries. Full production-suite and review results follow below.

```sh
export PATH=/home/trevor/.nvm/versions/node/v24.21.0/bin:$PATH
npm run typecheck
npm run lint
npm run test:unit
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/odc-playwright ./node_modules/.bin/playwright test
```

The `/tmp` browser path is the previously documented isolated WebKit host-library workaround. Normal CI uses standard Playwright dependencies. All fixtures and evidence are synthetic; no file content leaves the browser during product processing. Operator/reference-laptop acceptance remains outside automated qualification. PR #4 remains draft; no merge or deployment.

## Focused review

[CE review receipt](review.json): completed focused correctness and separate local adversarial review against the exact pre-fix commit, with no findings or residuals. Root `AGENTS.md` was the applicable standards fallback. Review inspected all six fix-owned source/test files and excluded investigation artifacts; no whole-U4 review or new plan was started. Abort/generation cleanup, success/failure/cancel release, current-state confirmation, scheduled preview and proof fidelity were checked. No source changes followed review.

The requested Claude Opus 5.5/high route could not fetch the pinned `acpx@0.19.5` transport (npm ETARGET before egress), so it did not review or receive code. A separate local adversarial context supplied the required fallback; no cross-model independence claim is made. The first delegated review orchestration had also failed before review at a model usage limit; the parent completed the focused procedure with a successful adversarial leaf. The receipt and stage log preserve actual coverage.

## Final local production qualification

[Full production browser suite](full-browser-suite.json): **165/165 passed**, 55 each in Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2, with zero failures, skips or flaky retries; elapsed 645.2 seconds. This covers every existing production browser test as well as all three new regressions. No production/test edit followed that run. [Tested source hashes](tested-source.sha256) match all six fix-owned runtime/test files. `git diff --check` passes.

The remote GitHub Actions result for the pushed fix is recorded in PR #4 after CI completes; this document reports only checks actually run locally. No merge, deployment or U5 work is authorized or performed.
