import { parseDate } from "../../src/engine/dates";
import { expect, test } from "vitest";
import { makeWorkflow, type Field } from "../../src/engine/workflow";
import { evaluate } from "../../src/engine/recipes";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
import { displayValue } from "../../src/engine/values";
import {
  encodeWorkflow,
  decodeUsableWorkflow,
} from "../../src/workflows/codec";
const patterns = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"] as const;
const workflow = (
  source: (typeof patterns)[number] = "MM/DD/YYYY",
  target: (typeof patterns)[number] = "YYYY-MM-DD",
) => {
  const w = makeWorkflow(["Date", "ID"]);
  w.fields[0] = {
    ...w.fields[0],
    type: "date",
    date: { source, target },
    recipe: { kind: "copy", source: "date" },
  };
  w.fields[1].recipe = { kind: "copy", source: "id" };
  return w;
};
const input = (text: string) =>
  parseCsv(new TextEncoder().encode(`Date,ID\n${text},001234`), ",", "dates");
test("AC-09 all nine explicit pattern pairs preserve calendar dates and exact CSV bytes through portable JSON", () => {
  const dates = ["2026-10-08", "10/08/2026", "08/10/2026"];
  for (const [s, source] of patterns.entries())
    for (const [t, target] of patterns.entries()) {
      const w = decodeUsableWorkflow(encodeWorkflow(workflow(source, target)));
      const table = input(dates[s]);
      const run = evaluate(w, table);
      expect(run.workflowIssues).toEqual([]);
      expect(run.summary.valid).toBe(1);
      expect(run.rows[0].values[0]).toMatchObject({
        kind: "date",
        year: 2026,
        month: 10,
        day: 8,
      });
      expect(run.rows[0].values.map(displayValue)).toEqual([
        dates[t],
        "001234",
      ]);
      expect(Buffer.from(serializeCsv(w, run, undefined))).toEqual(
        Buffer.from(`Date,ID\r\n${dates[t]},001234\r\n`),
      );
      expect(table.rows[0].cells[0].raw).toBe(dates[s]);
      expect(encodeWorkflow(w)).not.toContain("001234");
      expect(run.rows[0].provenance[0]).toMatchObject({
        source: "date",
        date: { source, target },
      });
    }
});
test("ambiguous text changes meaning only with the explicitly selected pattern", () => {
  expect(
    displayValue(evaluate(workflow(), input("03/04/2026")).rows[0].values[0]),
  ).toBe("2026-03-04");
  expect(
    displayValue(
      evaluate(workflow("DD/MM/YYYY"), input("03/04/2026")).rows[0].values[0],
    ),
  ).toBe("2026-04-03");
});
test("strict calendar validation rejects impossible, nonpadded, inferred, datetime and whitespace inputs", () => {
  for (const text of [
    "2023-02-29",
    "1900-02-29",
    "2100-02-29",
    "2026-04-31",
    "2026-00-01",
    "2026-13-01",
    "2026-01-00",
    "2026-01-32",
    "0000-01-01",
    "2026-1-01",
    "26-01-01",
    "2026/01/01",
    "2026-01-01T00:00:00Z",
    " 2026-01-01",
    "2026-01-01 ",
    " ",
    "October 8 2026",
    "10/08/2026",
  ]) {
    const w = workflow("YYYY-MM-DD");
    const run = evaluate(w, input(text));
    expect(run.workflowIssues).toEqual([]);
    expect(run.rows[0].status, text).toBe("invalid");
    expect(run.rows[0].issues[0]).toMatchObject({
      code: "date-input",
      field: "field-0",
      source: "date",
      record: 2,
      line: 2,
    });
    expect(() => serializeCsv(w, run, undefined)).toThrow();
  }
  for (const text of [
    "0001-01-01",
    "2024-02-29",
    "2000-02-29",
    "2026-04-30",
    "9999-12-31",
  ]) {
    const run = evaluate(workflow("YYYY-MM-DD", "YYYY-MM-DD"), input(text));
    expect(run.rows[0].status, text).toBe("valid");
    expect(displayValue(run.rows[0].values[0])).toBe(text);
  }
});
test("optional blank dates pass and required blanks fail; failed split stays invalid", () => {
  const w = workflow();
  expect(evaluate(w, input("")).rows[0].status).toBe("valid");
  w.fields[0].required = true;
  expect(evaluate(w, input("")).rows[0].issues.map((i) => i.code)).toEqual([
    "required",
  ]);
  w.fields[0].required = false;
  w.fields[0].recipe = {
    kind: "split",
    source: "date",
    delimiter: "|",
    segments: 2,
    index: 0,
    trim: false,
    optionalEmpty: [0],
  };
  expect(evaluate(w, input("|")).rows[0].status).toBe("invalid");
  w.fields[0].recipe.optionalEmpty = [0, 1];
  expect(evaluate(w, input("|")).rows[0].status).toBe("valid");
});
test("date interpretation follows primary text recipes and explicit trim", () => {
  const w = workflow("YYYY-MM-DD", "DD/MM/YYYY");
  for (const recipe of [
    { kind: "constant", value: { kind: "text", text: "2024-02-29" } },
    {
      kind: "split",
      source: "date",
      delimiter: "|",
      segments: 2,
      index: 1,
      trim: true,
      optionalEmpty: [],
    },
    {
      kind: "combine",
      components: [
        { kind: "literal", text: "2024-" },
        { kind: "literal", text: "02-29" },
      ],
      separator: "",
    },
  ] as Field["recipe"][]) {
    w.fields[0].recipe = recipe;
    expect(
      displayValue(evaluate(w, input("x| 2024-02-29 ")).rows[0].values[0]),
    ).toBe("29/02/2024");
  }
  w.fields[0].recipe = { kind: "copy", source: "date" };
  w.fields[0].trim = true;
  expect(
    displayValue(evaluate(w, input(" 2024-02-29 ")).rows[0].values[0]),
  ).toBe("29/02/2024");
});
test("missing formats and incompatible date/numeric/text settings cannot execute or save", () => {
  for (const patch of [
    { date: undefined },
    { type: "text" },
    { type: "number" },
    { wholeNumber: true },
    { scale: 2 },
    { rounding: { mode: "half-up", places: 2 } },
    { maxLength: 20 },
    {
      recipe: { kind: "constant", value: { kind: "number", decimal: "2026" } },
    },
  ] as Partial<Field>[]) {
    const w = workflow();
    Object.assign(w.fields[0], patch);
    expect(
      evaluate(w, input("10/08/2026")).workflowIssues.length,
    ).toBeGreaterThan(0);
    expect(() => encodeWorkflow(w)).toThrow();
  }
  const w = workflow();
  const json = JSON.parse(encodeWorkflow(w));
  for (const date of [
    { source: "auto", target: "YYYY-MM-DD" },
    { source: "YYYY-MM-DD" },
    { source: "YYYY-MM-DD", target: "YYYY-MM-DD", script: "1" },
  ]) {
    json.fields[0].date = date;
    expect(() => decodeUsableWorkflow(JSON.stringify(json))).toThrow();
  }
});

test("date parser rejects trailing newlines instead of accepting an anchored prefix", () => {
  expect(parseDate("2026-01-01\n", "YYYY-MM-DD")).toBeUndefined();
});
