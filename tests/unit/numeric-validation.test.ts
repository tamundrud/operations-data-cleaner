import { expect, test } from "vitest";
import { makeWorkflow, type Field } from "../../src/engine/workflow";
import { evaluate } from "../../src/engine/recipes";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
import { displayValue } from "../../src/engine/values";
import {
  encodeWorkflow,
  decodeUsableWorkflow,
} from "../../src/workflows/codec";
const source = (csv: string) =>
  parseCsv(new TextEncoder().encode(csv), ",", "numeric");
const workflow = () => {
  const w = makeWorkflow(["Cases", "Weight", "Sum", "Reference"]);
  w.fields[0] = {
    ...w.fields[0],
    type: "number",
    recipe: {
      kind: "calculate",
      operation: "divide",
      left: { kind: "source", source: "units" },
      right: { kind: "source", source: "factor" },
    },
  };
  w.fields[1] = {
    ...w.fields[1],
    type: "number",
    recipe: {
      kind: "calculate",
      operation: "multiply",
      left: { kind: "source", source: "cases" },
      right: { kind: "number", decimal: "12" },
    },
  };
  w.fields[2] = {
    ...w.fields[2],
    type: "number",
    scale: 1,
    recipe: {
      kind: "calculate",
      operation: "add",
      left: { kind: "number", decimal: "0.1" },
      right: { kind: "number", decimal: "0.2" },
    },
  };
  w.fields[3].recipe = { kind: "copy", source: "id" };
  return w;
};
test("AC-05/06/10 exact CSV and complete source/constant provenance survive portable reuse", () => {
  const w = workflow(),
    json = encodeWorkflow(w),
    restored = decodeUsableWorkflow(json);
  const run = evaluate(
    restored,
    source("ID,Factor,Cases,Units,Unused\n001234,4,15,24,x"),
  );
  expect(run.workflowIssues).toEqual([]);
  expect(run.summary.valid).toBe(1);
  expect(run.rows[0].values.map(displayValue)).toEqual([
    "6",
    "180",
    "0.3",
    "001234",
  ]);
  expect(Buffer.from(serializeCsv(restored, run, undefined)).toString()).toBe(
    "Cases,Weight,Sum,Reference\r\n6,180,0.3,001234\r\n",
  );
  expect(
    run.rows[0].provenance
      .filter((p) => p.field === "field-0")
      .map((p) => ("source" in p ? p.source : "constant")),
  ).toEqual(["units", "factor"]);
  expect(json).not.toContain("001234");
  for (const mode of ["half-up", "half-even", "truncate"] as const) {
    w.fields[0].rounding = { mode, places: 2 };
    w.fields[0].scale = 2;
    w.fields[0].wholeNumber = false;
    expect(decodeUsableWorkflow(encodeWorkflow(w)).fields).toEqual(w.fields);
  }
});
test("optional calculations still reject missing, malformed and zero divisors with row references", () => {
  const w = workflow();
  const run = evaluate(
    w,
    source(
      "Units,Factor,Cases,ID\n24,0,15,one\n24,,15,two\n24,4 kg,15,three\n0,4,0,four",
    ),
  );
  expect(run.workflowIssues).toEqual([]);
  expect(run.rows.map((r) => r.status)).toEqual([
    "invalid",
    "invalid",
    "invalid",
    "valid",
  ]);
  expect(run.rows.map((r) => r.issues[0]?.code)).toEqual([
    "division-zero",
    "missing-operand",
    "numeric-input",
    undefined,
  ]);
  expect(run.rows[0].issues[0]).toMatchObject({
    scope: "row",
    field: "field-0",
    record: 2,
    line: 2,
    row: "numeric:2",
  });
  expect(run.rows[3].values.map(displayValue)).toEqual([
    "0",
    "0",
    "0.3",
    "four",
  ]);
  expect(() => serializeCsv(w, run, undefined)).toThrow();
});
test("number copy and constants validate scale and whole numbers without converting text identifiers", () => {
  const w = makeWorkflow(["Number", "Identifier"]);
  w.fields[0] = {
    ...w.fields[0],
    type: "number",
    wholeNumber: true,
    rounding: { mode: "half-up", places: 0 },
    recipe: { kind: "copy", source: "n" },
  };
  w.fields[1].recipe = { kind: "copy", source: "id" };
  const run = evaluate(
    w,
    source("N,ID\n1.5,00000000000000000000000000001\n,0001"),
  );
  expect(run.workflowIssues).toEqual([]);
  expect(run.rows[0].issues[0].code).toBe("whole-number");
  expect(run.rows[0].values[1]).toEqual({
    kind: "text",
    text: "00000000000000000000000000001",
  });
  expect(run.rows[1].status).toBe("valid");
  w.fields[0] = {
    ...w.fields[0],
    wholeNumber: false,
    rounding: undefined,
    scale: 1,
    recipe: { kind: "constant", value: { kind: "number", decimal: "1.25" } },
  };
  expect(evaluate(w, source("N,ID\n2,x")).rows[0].issues[0].code).toBe(
    "numeric-precision",
  );
});
test("incompatible numeric settings and future capabilities cannot be saved or partially executed", () => {
  for (const patch of [
    { type: "text" },
    { trim: true },
    { maxLength: 4 },
    { scale: 1, rounding: { mode: "half-up", places: 2 } },
    { date: { source: "YYYY-MM-DD", target: "MM/DD/YYYY" } },
  ] as Partial<Field>[]) {
    const w = workflow();
    Object.assign(w.fields[0], patch);
    expect(
      evaluate(w, source("Units,Factor,Cases,ID\n24,4,15,x")).workflowIssues
        .length,
    ).toBeGreaterThan(0);
    expect(() => encodeWorkflow(w)).toThrow();
  }
});
