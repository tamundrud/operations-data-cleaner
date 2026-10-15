# Examples

Only fictional, synthetic datasets belong here.

- `u2/` contains the original copy-mapping source, header template, version 1 configuration and exact golden export. **Try sample data** loads it.
- `u3-source.csv`, `u3-workflow.json` and `u3-expected.csv` demonstrate a fixed text code `0012`, exact number `12.50`, intentional optional blank and explicit boundary trim with internal spacing preserved. **Try fixed fields example** loads it. Expected output is UTF-8 with BOM, semicolon delimiter, no header and CRLF line endings.

These configuration files are examples for the existing strict workflow codec. U3 does not add workflow import, save or persistence controls. No vendor-certified import compatibility is claimed.
