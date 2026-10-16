# U7 CI correction: workflow-name entry after column settings

Pre-fix head: 930b0fe214438da833efe7fe8acf0754aa5f95bd; clean feature checkout. Scope: the new calculation browser test, its source manifest and validation evidence. No production engine, UI, save/storage, workflow-format, dependency or CI configuration changes.

The first GitHub run passed 212/213 browser cases. Only WebKit's new calculation save/reopen/portable test failed. Its captured state shows an empty workflow-name input and the correct message `Enter a nonblank workflow name before saving.` The strict name check rejected the save before IndexedDB writing. Other storage and U7 tests passed across all three browsers.

The trace places the name input above the viewport (y = -277.75) when `fill("Synthetic U7")` starts immediately after Done. The fill returns about 9 ms later, but the next snapshot still records an empty input; Save then raises the name error. Column closing has deferred focus restoration (`MappingRows.tsx` closeSettings/focus). The new test assumed the close/input interaction had completed and never checked the entered value. This is the observed invalid state at the test input boundary, rather than a numeric result or persistence failure.

The correction waits for the existing Edit button focus-return contract, scrolls the name field into view, fills it, and asserts the exact value before Save. It preserves all actual save confirmation, reload, portable import and independent exact-download assertions. No timeout, retry, skip, mocked save or weakened assertion was introduced.

Local WebKit reproduction was unavailable because browser CDN downloads are denied. Controlled Chromium focus interleaving did not reproduce WebKit's lost entry (Chromium restored input focus), so no lower-level WebKit driver cause is claimed. The original CI trace is the red evidence. This convergent test-readiness correction removes the recorded off-screen/dialog-transition setup and validates the input explicitly; the new three-browser CI run is authoritative verification for WebKit.

Installed ce-debug was followed in inherited non-interactive pipeline scope: artifact-based diagnosis, inspection of the name guard and existing focus behavior, competing focus/scroll versus persistence explanations, focused correction, and check/push without a product decision. Related U4 CI history concerned pending Open activation and is a different path. No issue of record was supplied or created.

Typecheck and lint pass. The final production Chromium calculation suite passes 6/6 in 18.1 seconds, including saved reopen/portable reuse and both source-remapping regressions (focused-chromium.txt). Earlier complete local qualification remains 159 unit tests and 71 browser cases; core production code did not change. The GitHub artifact URL and SHA-256 are in artifact.json, and the synthetic failure snapshot is retained in webkit-error-context.md.
