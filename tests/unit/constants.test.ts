import { expect, test } from "vitest";
import { makeWorkflow, referencedHeaders } from "../../src/engine/workflow";
import { evaluate } from "../../src/engine/recipes";
import { parseCsv, serializeCsv } from "../../src/formats/csv";

const source = parseCsv(new TextEncoder().encode("ID,Note\n001, x \n,\n002,y"), ",", "fixed");
test("typed constants need no source and preserve exact literals, rows and provenance", () => {
  const w = makeWorkflow(["CustomerCode", "Weight", "Empty"]);
  w.fields[0].recipe = { kind: "constant", value: { kind: "text", text: " 0012 " } };
  w.fields[1] = { ...w.fields[1], type: "number", recipe: { kind: "constant", value: { kind: "number", decimal: "12.50" } } };
  w.fields[2].recipe = { kind: "constant", value: { kind: "blank" } };
  const original = structuredClone(source);
  const run = evaluate(w, source);
  expect(run.workflowIssues).toEqual([]);
  expect(referencedHeaders(w.fields)).toEqual([]);
  expect(run.summary).toMatchObject({ inputRows: 3, skippedBlanks: 1, candidates: 2, valid: 2 });
  for (const row of run.rows) {
    expect(row.values).toEqual([{ kind: "text", text: " 0012 " }, { kind: "number", decimal: "12.50" }, { kind: "blank" }]);
    expect(row.provenance[0]).toMatchObject({ field: "field-0", row: row.id, constant: { kind: "text", text: " 0012 " } });
    expect(row.provenance[0]).not.toHaveProperty("source");
  }
  expect(run.rows.map(r => [r.record, r.line])).toEqual([[2, 2], [4, 4]]);
  expect(source).toEqual(original);
  expect(new TextDecoder().decode(serializeCsv(w, run, undefined))).toBe('CustomerCode,Weight,Empty\r\n" 0012 ",12.50,\r\n" 0012 ",12.50,\r\n');
});
test.each(["12.50", "-12.50", "+0012.500", "90071992547409931234567890.123456789", ".50", "12."])("number %s remains a decimal string and is not formula text", decimal => {
  const w = makeWorkflow(["Weight"]);
  w.fields[0] = { ...w.fields[0], type: "number", recipe: { kind: "constant", value: { kind: "number", decimal } } };
  const run = evaluate(w, source);
  expect(run.workflowIssues).toEqual([]);
  expect(run.summary.warningIssues).toBe(0);
  expect(run.rows[0].values).toEqual([{ kind: "number", decimal }]);
  expect(new TextDecoder().decode(serializeCsv(w, run, undefined))).toBe(`Weight\r\n${decimal}\r\n${decimal}\r\n`);
});
test.each(["text", "number"] as const)("intentional blank %s is optional, required blank is invalid", type => {
  const w = makeWorkflow(["Blank"]);
  w.fields[0] = { ...w.fields[0], type, recipe: { kind: "constant", value: { kind: "blank" } } };
  expect(evaluate(w, source).summary.valid).toBe(2);
  w.fields[0].required = true;
  const run = evaluate(w, source);
  expect(run.summary.invalid).toBe(2);
  expect(run.rows[0].issues[0]).toMatchObject({ code: "required", field: "field-0", row: "fixed:2" });
  expect(() => serializeCsv(w, run, undefined)).toThrow(/Export blocked/);
});
test("formula-like constants require safe/raw choice; reordering retains value and type", () => {
  const w = makeWorkflow(["Code", "Formula"]);
  w.fields[0].recipe = { kind: "constant", value: { kind: "text", text: "0012" } };
  w.fields[1].recipe = { kind: "constant", value: { kind: "text", text: "=1+1" } };
  w.fields.reverse();
  const run = evaluate(w, source);
  expect(run.summary.warningOnly).toBe(2);
  expect(() => serializeCsv(w, run, undefined)).toThrow(/Choose/);
  expect(new TextDecoder().decode(serializeCsv(w, run, "raw"))).toBe("Formula,Code\r\n=1+1,0012\r\n=1+1,0012\r\n");
  expect(new TextDecoder().decode(serializeCsv(w, run, "escape"))).toBe("Formula,Code\r\n'=1+1,0012\r\n'=1+1,0012\r\n");
});
test("malformed or incompatible constants and future modifiers fail closed", () => {
  for (const patch of [
    { type: "number", recipe: { kind: "constant", value: { kind: "text", text: "12.50" } } },
    { type: "text", recipe: { kind: "constant", value: { kind: "number", decimal: "12.50" } } },
    { type: "number", recipe: { kind: "constant", value: { kind: "number", decimal: "1e3" } } },
    { type: "number", trim: true, recipe: { kind: "constant", value: { kind: "number", decimal: "1" } } },
    { type: "number", scale: 2, rounding: { mode: "half-up", places: 3 }, recipe: { kind: "constant", value: { kind: "number", decimal: "1.00" } } },
  ]) {
    const w = makeWorkflow(["Invalid"]);
    Object.assign(w.fields[0], patch);
    const run = evaluate(w, source);
    expect(run.workflowIssues.length).toBeGreaterThan(0);
    expect(run.rows).toEqual([]);
    expect(() => serializeCsv(w, run, undefined)).toThrow(/Export blocked/);
  }
});
