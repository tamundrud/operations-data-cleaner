# Fictional logistics demonstration

All names, addresses and order values here are synthetic. No vendor certification is claimed.

For a one-click introduction use **Try sample data** in the app. For the complete logistics example:

1. Start a fresh session and use **Import workflow** to open `workflow.json`.
2. Upload `source.csv`. Compare the download with `expected.csv` (UTF-8, comma, header, CRLF).
3. Save the workflow and download its backup. Reload, open the saved workflow, and upload the source again. Import the backup in another browser for the same results.
4. Use **Edit workflow** to inspect the independent recipes or choose Excel output. `template.csv` documents the destination column order.
5. For exception review, upload `needs-correction.csv`: two candidates, one invalid quantity. Acknowledge the one excluded row for a partial export, or expand **Inspect original source table**, correct Units in record 3 from `Twelve` to `12`, and export both rows. The original value remains inspectable; the saved recipe is unchanged.

The example demonstrates copy, explicit trim, a fixed customer code, four strict address segments, ordered combination, source-factor division, constant multiplication and explicit dates. Suggestions, reordering and other settings remain available in the existing editor. No inference or sample-specific behavior is added.
