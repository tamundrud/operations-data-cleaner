# Qualify Excel archives before flattening cells

U1's investigation reproduced two distinct failure modes: metadata is lost when cells are flattened, and resource checks on the worksheet run after ZIP decompression. The fix is an evidence-backed import boundary, not a row cap.

Reproduce using [the isolated synthetic harness](../../tests/qualification/xlsx/README.md). Inspect the [decision](../decisions/excel-fidelity.md) and both JSON reports before reusing the approach. Preserve raw type/value/display/format/epoch/formula-cache data. Verify ZIP actual expansion and central/local consistency before SheetJS; validate CRC and dangerous cell/range/format metadata. Native streaming decompression passed the comparison, so adding a second runtime ZIP library or reconstructing the archive is unnecessary for the qualified profile.

Whole-member fflate inflation delivered an 8 MiB output chunk before its callback. Small input slices reduced that burst, but callback quotas alone do not constrain the allocations already made. Declared expansion, a file-size check and a worker watchdog cannot substitute for actual bounded decompression. Worksheet paths come from package relationships, not a fixed `worksheets/` prefix. The independent review reproduced a range-check bypass at `xl/custom.xml`; inspect all XML references and prevent XML parser routing to skipped non-XML members. A failing rejection regression preceded the fix. Test forged-small lengths, CRC corruption, duplicate paths and hyperlink ranges as well as advertised worksheet dimensions.

Test-driver transport also matters: serializing a 25 MiB hostile fixture as a JavaScript number array exhausted the Node test driver. Base64 plus an indexed byte-decoding loop avoids that test-only overhead; real application File/ArrayBuffer processing must stay independent of this driver.

Use these results only as feasibility evidence. The production worker, errors, privacy, ordinary workbook compatibility and full 10,000-row pipeline must be requalified in U9/U10/U13.
