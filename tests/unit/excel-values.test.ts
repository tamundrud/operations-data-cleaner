import { expect, test } from "vitest";
import { evaluate } from "../../src/engine/recipes";
import { makeWorkflow, type Field } from "../../src/engine/workflow";
import { displayValue, type SourceCell, type SourceTable } from "../../src/engine/values";

type Excel = NonNullable<SourceCell["excel"]>;

function run(excel: Excel, raw: string, display: string, fields?: Field[]) {
  const workflow = makeWorkflow(["Reference"]);
  workflow.fields[0].recipe = { kind: "copy", source: "reference" };
  if (fields) workflow.fields = fields;
  const source: SourceTable = {
    dataset: "excel",
    delimiter: ",",
    inputRows: 1,
    skippedBlanks: 0,
    columns: [{ key: "reference", header: "Reference", position: 0 }],
    rows: [
      {
        id: "excel:2",
        record: 1,
        line: 2,
        cells: [{ kind: "text", raw, display, excel }],
      },
    ],
  };
  return evaluate(workflow, source);
}
const copy = (type: Field["type"] = "text"): Field => ({
  id: "copy",
  header: "Copy",
  type,
  required: false,
  recipe: { kind: "copy", source: "reference" },
});
const numeric: Excel = {
  type: "n",
  value: 1234,
  format: "000000",
  date1904: false,
};

test("Excel numeric identifiers use supported display while numeric output and arithmetic use raw values", () => {
  const fields: Field[] = [
    copy(),
    { ...copy("number"), id: "number", header: "Number" },
    {
      id: "calc",
      header: "Calculated",
      type: "number",
      required: false,
      recipe: {
        kind: "calculate",
        operation: "add",
        left: { kind: "source", source: "reference" },
        right: { kind: "number", decimal: "1" },
      },
    },
  ];
  expect(
    run(numeric, "1234", "001234", fields).rows[0].values.map(displayValue),
  ).toEqual(["001234", "1234", "1235"]);
  expect(
    run(
      { type: "s", value: " 001234 ", date1904: false },
      " 001234 ",
      "changed",
    ).rows[0].values.map(displayValue),
  ).toEqual([" 001234 "]);
});

test("combine and split preserve numeric identifier display and carry per-source metadata", () => {
  const fields: Field[] = [
    {
      ...copy(),
      recipe: {
        kind: "combine",
        components: [
          { kind: "source", source: "reference" },
          { kind: "literal", text: "x" },
        ],
        separator: "-",
      },
    },
    {
      ...copy(),
      id: "split",
      header: "Split",
      recipe: {
        kind: "split",
        source: "reference",
        delimiter: "1",
        segments: 2,
        index: 0,
        trim: false,
        optionalEmpty: [],
      },
    },
  ];
  const result = run(numeric, "1234", "001234", fields).rows[0];
  expect(result.values.map(displayValue)).toEqual(["001234-x", "00"]);
  expect(result.provenance[0]).toMatchObject({
    source: "reference",
    excel: numeric,
  });
});

test("cached formulas warn for every dependent output including arithmetic and preserve formula evidence", () => {
  const fields: Field[] = [
    copy(),
    {
      ...copy("number"),
      id: "calc",
      header: "Calculated",
      recipe: {
        kind: "calculate",
        operation: "add",
        left: { kind: "source", source: "reference" },
        right: { kind: "number", decimal: "1" },
      },
    },
  ];
  const result = run(
    { ...numeric, formula: "SUM(A1:A2)" },
    "1234",
    "001234",
    fields,
  ).rows[0];
  expect(result.status).toBe("warning");
  expect(
    result.issues
      .filter((i) => i.code === "excel-formula-cache")
      .map((i) => i.field),
  ).toEqual(["copy", "calc"]);
  expect(result.provenance[0]).toMatchObject({
    excel: { formula: "SUM(A1:A2)" },
  });
});

test("missing formula caches and errors invalidate optional referenced outputs, unreferenced cells do not", () => {
  for (const excel of [
    { type: "z", formula: "A1+1", date1904: false },
    { type: "e", value: 7, date1904: false },
    { type: "e", value: 7, formula: "1/0", date1904: false },
  ] satisfies Excel[]) {
    const result = run(excel, "", "").rows[0];
    expect(result.status).toBe("invalid");
    expect(result.values).toEqual([{ kind: "blank" }]);
    expect(
      run(excel, "", "", [
        {
          ...copy(),
          recipe: { kind: "constant", value: { kind: "text", text: "safe" } },
        },
      ]).rows[0].status,
    ).toBe("valid");
  }
});

test("unsupported numeric formats fall back to raw evidence and warn; suspicious numeric identifiers warn only for text", () => {
  const result = run(
    { ...numeric, unsupportedFormat: true },
    "1234",
    "unreliable",
  ).rows[0];
  expect(result.values.map(displayValue)).toEqual(["1234"]);
  expect(result.issues.some((i) => i.code === "excel-format")).toBe(true);
  const long = { ...numeric, value: 1234567890123456 };
  expect(
    run(long, "1234567890123456", "1234567890123456").rows[0].issues.some(
      (i) => i.code === "excel-precision",
    ),
  ).toBe(true);
  expect(
    run(long, "1234567890123456", "1234567890123456", [
      copy("number"),
    ]).rows[0].issues.some((i) => i.code === "excel-precision"),
  ).toBe(false);
});

test("Excel boolean cells are literal uppercase text", () => {
  expect(
    run(
      { type: "b", value: true, date1904: false },
      "true",
      "true",
    ).rows[0].values.map(displayValue),
  ).toEqual(["TRUE"]);
});

test("explicit Excel dates use calendar metadata only and reject serials without valid date evidence", () => {
  const fields: Field[] = [
    { ...copy("date"), date: { source: "excel", target: "DD/MM/YYYY" } },
  ];
  const excel: Excel = {
    type: "n",
    value: 45352,
    format: "yyyy-mm-dd",
    date1904: false,
    date: { year: 2024, month: 3, day: 1 },
  };
  expect(
    run(excel, "45352", "3/1/24", fields).rows[0].values.map(displayValue),
  ).toEqual(["01/03/2024"]);
  for (const bad of [
    { ...excel, date: undefined },
    { ...excel, dateInvalid: true },
    { ...excel, type: "s", value: "2024-03-01" },
  ])
    expect(run(bad, "45352", "3/1/24", fields).rows[0].status).toBe("invalid");
  expect(
    run(
      {
        ...excel,
        value: 0,
        date1904: true,
        date: { year: 1904, month: 1, day: 1 },
      },
      "0",
      "1/1/04",
      fields,
    ).rows[0].values.map(displayValue),
  ).toEqual(["01/01/1904"]);
});

test("cached text, false and zero remain usable while combine/cache failures retain source-specific issues", () => {
  for (const [excel, raw, expected] of [
    [
      {
        type: "str",
        value: "001234",
        formula: 'TEXT(A1,"000000")',
        date1904: false,
      },
      "001234",
      "001234",
    ],
    [
      { type: "b", value: false, formula: "A1=A2", date1904: false },
      "FALSE",
      "FALSE",
    ],
    [{ type: "n", value: 0, formula: "A1-A1", date1904: false }, "0", "0"],
  ] satisfies [Excel, string, string][]) {
    const result = run(excel, raw, raw).rows[0];
    expect(result.values.map(displayValue)).toEqual([expected]);
    expect(result.issues.map((i) => i.code)).toEqual(["excel-formula-cache"]);
  }
  const fields: Field[] = [
    {
      ...copy(),
      recipe: {
        kind: "combine",
        components: [
          { kind: "literal", text: "prefix" },
          { kind: "source", source: "reference" },
        ],
        separator: "-",
      },
    },
  ];
  const result = run(
    { type: "z", formula: "A1+1", date1904: false },
    "",
    "",
    fields,
  ).rows[0];
  expect(result.values).toEqual([{ kind: "blank" }]);
  expect(result.issues[0]).toMatchObject({
    source: "reference",
    field: "copy",
    severity: "error",
  });
});

test("numeric date metadata is not interpreted through display text or an unrelated text pattern", () => {
  const fields: Field[] = [
    { ...copy("date"), date: { source: "MM/DD/YYYY", target: "YYYY-MM-DD" } },
  ];
  const excel: Excel = {
    type: "n",
    value: 45352,
    date1904: false,
    date: { year: 2024, month: 3, day: 1 },
  };
  expect(run(excel, "45352", "03/01/2024", fields).rows[0].status).toBe(
    "invalid",
  );
  expect(
    run(
      { type: "s", value: "03/01/2024", date1904: false },
      "03/01/2024",
      "03/01/2024",
      fields,
    ).rows[0].values.map(displayValue),
  ).toEqual(["2024-03-01"]);
});

test("native Excel numbers in exponent notation become plain decimals for numeric interpretation", () => {
  const result = run({ type: "n", value: 1e-7, date1904: false }, "1e-7", "0.0000001", [copy("number")]);
  expect(result.summary.invalid).toBe(0);
  expect(result.rows[0].values.map(displayValue)).toEqual(["0.0000001"]);
});

test("stale cache warnings remain visible without requiring unrelated CSV formula escaping", async () => {
  const { serializeCsv } = await import('../../src/formats/csv');
  const result = run({ type: 'n', value: 7, formula: '1+6', date1904: false }, '7', '7');
  const w = makeWorkflow(['Reference']);
  w.fields[0].recipe = { kind: 'copy', source: 'reference' };
  expect(result.summary.warningOnly).toBe(1);
  expect(new TextDecoder().decode(serializeCsv(w, result, undefined))).toBe('Reference\r\n7\r\n');
});
