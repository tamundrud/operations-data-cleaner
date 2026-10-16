# WebKit search-clear synchronization follow-up

[Run 38851643235](https://github.com/tamundrud/operations-data-cleaner/actions/runs/38851643235)
passed all pending-Open and U5 suggestion cases in Chromium, Firefox and WebKit.
It passed 176/177 browser tests; the older 25-source/30-output layout test failed
in WebKit while looking for Source 1 after clearing a source search.

Artifact 12025992293 (SHA256
`47ff1c5dd94fcecb5c07192c612e06a0529cede1ac24a12311de40b1e13e37b2`)
shows `fill("")` completing at trace time 413330.841, but the final snapshot still
has `source 25` in Search source columns and Output 30 focused. Only Source 25
is rendered, so the following Source 1 lookup correctly finds nothing.

Mapping Source 25 to Output 30 schedules requestAnimationFrame focus restoration.
The test immediately clears search without waiting for that restoration. The
trace is consistent with the callback interrupting the fill's keyboard phase.
Installed Playwright implements empty text fill by selecting/focusing the input
and then sending a separate keyboard Delete. That protocol boundary supports
the focus-race diagnosis. The fix waits for Output 30 to receive focus before clearing search, and asserts
the cleared value before continuing. It preserves native pointer actions and all
alignment, source reuse and exact exported-byte assertions.

A controlled Chromium attempt did not reproduce the WebKit failure. No local
WebKit pass or deterministic red reproduction is claimed. Local Chromium repeats
and final three-browser GitHub CI results are recorded on PR #5. The focused CE
review receipt is in `search-review/`.

Production behavior, test timeouts and runner configuration are unchanged.

Local typecheck and lint passed. The first three Chromium repeats passed twice;
one exhausted the existing 30-second test budget later at Source 18, after the
search-clear assertions had passed. This is distinct from the absent Source 1
CI failure. No timeout was increased; an isolated repeat follows.

The isolated three-repeat Chromium run passed 3/3 (56.5 seconds total), with
individual cases taking 15.6, 15.4 and 20.9 seconds. Final WebKit confirmation
remains owned by the complete GitHub CI run on the new head.
