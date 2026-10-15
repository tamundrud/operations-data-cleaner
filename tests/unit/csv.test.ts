import { expect, test } from "vitest";
import { parseCsv } from "../../src/formats/csv";
const bytes = (text: string) => new TextEncoder().encode(text);
test.each([",", ";", "\t"] as const)(
  "detects %s, preserves BOM and multiline provenance",
  (delimiter) => {
    const table = parseCsv(
      bytes(
        `\ufeff\r\nID${delimiter}Note\r\n001234${delimiter}"a\r\nb"\r\n000007${delimiter}x\r\n`,
      ),
      "auto",
      "d",
    );
    expect(table.delimiter).toBe(delimiter);
    expect(table.rows.map((r) => [r.record, r.line, r.cells[0].raw])).toEqual([
      [3, 3, "001234"],
      [4, 5, "000007"],
    ]);
  },
);
test.each(["A,a\n1,2", "A, \n1,2", " A  B ,a b\n1,2"])(
  "rejects normalized empty/duplicate headers",
  (text) => expect(() => parseCsv(bytes(text), ",", "d")).toThrow(/headers/),
);
test.each(['A,B\n"open,b', 'A,B\na"b,c', 'A,B\n"a"z,c', "A,B\n1,2,3"])(
  "rejects malformed input without truncation",
  (text) =>
    expect(() => parseCsv(bytes(text), ",", "d")).toThrow(/Malformed|Extra/),
);
test("strict UTF-8 and unsupported binary encodings", () => {
  expect(() => parseCsv(new Uint8Array([0xc3, 0x28]), ",", "d")).toThrow(
    /UTF-8/,
  );
  expect(() => parseCsv(bytes("A\0,B"), ",", "d")).toThrow(/NUL/);
});
test("short rows are preserved, a terminal delimiter is a real blank cell", () => {
  const t = parseCsv(bytes("A,B\r\nx\r\ny,\r\n"), ",", "d");
  expect(t.rows.map((r) => r.cells.map((c) => c.raw))).toEqual([
    ["x"],
    ["y", ""],
  ]);
});
test("counts actual blanks separately from end-of-file artifacts and whitespace", () => {
  for (const text of ["A\nx\n", "A\nx"])
    expect(parseCsv(bytes(text), ",", "d").inputRows).toBe(1);
  expect(parseCsv(bytes("A\nx\n\n\n \n"), ",", "d")).toMatchObject({
    inputRows: 4,
    skippedBlanks: 2,
  });
});

test('header-only retention still rejects malformed data and validates full table', () => {
  expect(parseCsv(bytes('A,B\n1,2\n3,4'), ',', 'template', true)).toMatchObject({ rows: [], inputRows: 2, columns: [{ header: 'A' }, { header: 'B' }] });
  expect(() => parseCsv(bytes('A,B\n1,2,3'), ',', 'template', true)).toThrow(/Extra/);
});

test('source byte budget fails before attempting to parse, without truncation', () => {
  expect(() => parseCsv(new Uint8Array(25 * 1024 * 1024 + 1), ',', 'd')).toThrow(/25 MiB/);
});
