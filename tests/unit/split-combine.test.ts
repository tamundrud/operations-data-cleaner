import { expect, test } from "vitest";
import { makeWorkflow, type Workflow } from "../../src/engine/workflow";
import { evaluate } from "../../src/engine/recipes";
import { displayValue } from "../../src/engine/values";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
import { decodeUsableWorkflow, encodeWorkflow } from "../../src/workflows/codec";
const parse = (csv: string) => parseCsv(new TextEncoder().encode(csv), ",", "synthetic");
const split = (): Workflow => {
  const w = makeWorkflow(["Street", "City", "Province", "Postal"]);
  w.fields.forEach((f, index) => { f.recipe = { kind: "split", source: "address", delimiter: ",", segments: 4, index, trim: true, optionalEmpty: [] }; });
  return w;
};

test("AC-03 independent split destinations produce exact trimmed CSV and retain original provenance", () => {
  const w = split();
  const source = parse('Address\r\n"123 Main St, Vancouver, BC, V5K 0A1"\r\n');
  const run = evaluate(w, source);
  expect(run.workflowIssues).toEqual([]);
  expect(run.rows[0].values.map(displayValue)).toEqual(["123 Main St", "Vancouver", "BC", "V5K 0A1"]);
  expect(Buffer.from(serializeCsv(w, run, undefined)).toString()).toBe("Street,City,Province,Postal\r\n123 Main St,Vancouver,BC,V5K 0A1\r\n");
  expect(run.rows[0].provenance).toEqual(w.fields.map((f, segment) => ({ field: f.id, row: "synthetic:2", source: "address", segment, segmentTrim: true })));
  expect(source.rows[0].cells[0].raw).toBe("123 Main St, Vancouver, BC, V5K 0A1");
});

test("strict segment count rejects extra and missing segments with actionable row/field/source references", () => {
  const run = evaluate(split(), parse('Address\n"a,b,c,d,e"\n"a,b,c"'));
  expect(run.workflowIssues).toEqual([]);
  expect(run.summary.invalid).toBe(2);
  run.rows.forEach((row, i) => {
    expect(row.values.map(displayValue)).toEqual(["", "", "", ""]);
    expect(row.issues).toHaveLength(4);
    expect(row.issues[0]).toMatchObject({ code: "split-count", scope: "row", severity: "error", row: row.id, record: i + 2, line: i + 2, field: "field-0", source: "address" });
    expect(row.issues[0].reason).toMatch(/expected 4.*found [35]/i);
    expect(row.issues[0].action).toMatch(/delimiter|segment/i);
  });
});

test("only explicitly optional empty positions succeed, without shifting or guessing missing delimiters", () => {
  const w = split();
  w.fields.forEach((f) => { if (f.recipe?.kind === "split") f.recipe.optionalEmpty = [1]; });
  const run = evaluate(w, parse('Address\n"a,,c,d"\n"a, ,c,d"\n"a,b,,d"\n"a,c,d"'));
  expect(run.rows.map((r) => r.status)).toEqual(["valid", "valid", "invalid", "invalid"]);
  expect(run.rows[0].values.map(displayValue)).toEqual(["a", "", "c", "d"]);
  expect(run.rows[2].issues[0]).toMatchObject({ code: "split-empty" });
  expect(run.rows[2].issues[0].reason).toMatch(/segment 3/i);
  w.fields[1].required = true;
  expect(evaluate(w, parse('Address\n"a,,c,d"')).rows[0].issues).toContainEqual(expect.objectContaining({ code: "required", field: "field-1" }));
});

test("literal multi-character delimiters and trimming are explicit, including unselected empty segments", () => {
  const w = split(); w.fields = [w.fields[0]];
  w.fields[0].recipe = { kind: "split", source: "address", delimiter: ".*", segments: 2, index: 1, trim: false, optionalEmpty: [] };
  expect(evaluate(w, parse('Address\n left .* right ')).rows[0].values.map(displayValue)).toEqual([" right "]);
  expect(evaluate(w, parse('Address\n.*right')).rows[0].status).toBe("invalid");
  w.fields[0].trim = true;
  expect(evaluate(w, parse('Address\n left .* right ')).rows[0].values.map(displayValue)).toEqual(["right"]);
});

const combine = () => {
  const w = makeWorkflow(["Combined"]);
  w.fields[0].recipe = { kind: "combine", components: [{ kind: "source", source: "id" }, { kind: "literal", text: "" }, { kind: "source", source: "empty" }, { kind: "literal", text: "Dock" }, { kind: "source", source: "id" }], separator: " | " };
  return w;
};
test("AC-04 ordered source/literal combination preserves repeats, empty positions and exact whitespace", () => {
  const w = combine(), run = evaluate(w, parse("ID,Empty\n0012,"));
  expect(run.workflowIssues).toEqual([]);
  expect(run.rows[0].values.map(displayValue)).toEqual(["0012 |  |  | Dock | 0012"]);
  expect(Buffer.from(serializeCsv(w, run, undefined)).toString()).toBe("Combined\r\n0012 |  |  | Dock | 0012\r\n");
  expect(run.rows[0].provenance).toHaveLength(5);
  expect(run.rows[0].provenance.map((p) => 'source' in p ? p.source : displayValue(p.constant))).toEqual(["id", "", "empty", "Dock", "id"]);
  if (w.fields[0].recipe?.kind === "combine") w.fields[0].recipe.separator = "";
  expect(evaluate(w, parse("ID,Empty\n0012,")).rows[0].values.map(displayValue)).toEqual(["0012Dock0012"]);
});

test("new recipes use existing required/max-length/formula safety and missing-header rules", () => {
  const w = combine();
  w.fields[0].maxLength = 2;
  expect(evaluate(w, parse("ID,Empty\n=1,")).rows[0].issues.map((i) => i.code)).toEqual(["max-length", "csv-risk"]);
  expect(evaluate(w, parse("Renamed,Empty\n1,")).workflowIssues.map((i) => i.code)).toEqual(["missing-header"]);
  w.fields[0].recipe = { kind: "combine", components: [{ kind: "literal", text: "" }, { kind: "literal", text: "" }], separator: "" };
  w.fields[0].required = true;
  expect(evaluate(w, parse("ID\nx")).rows[0].issues[0].code).toBe("required");
});

test("split and combine portable snapshots retain settings and detach configuration without source data", () => {
  const w = split(); w.fields.push({ ...combine().fields[0], id: "combined" });
  const encoded = encodeWorkflow(w), restored = decodeUsableWorkflow(encoded);
  expect(restored.source.referencedHeaders).toEqual(["address", "id", "empty"]);
  expect(restored.fields).toEqual(w.fields);
  expect(encoded).not.toMatch(/synthetic:|123 Main|filename/);
  const source = parse('ID,Empty,Address,Unused\n0012,,"123 Main St, Vancouver, BC, V5K 0A1",x');
  expect(evaluate(restored, source).rows[0].values.map(displayValue)).toEqual(["123 Main St", "Vancouver", "BC", "V5K 0A1", "0012 |  |  | Dock | 0012"]);
  if (w.fields[0].recipe?.kind === "split") w.fields[0].recipe.optionalEmpty.push(0);
  expect(restored.fields[0].recipe).toMatchObject({ optionalEmpty: [] });
});

test("malformed split/combine and output dependencies fail before evaluation or storage", () => {
  const w = split();
  for (const patch of [{ index: 4 }, { optionalEmpty: [4] }, { optionalEmpty: [1,1] }, { delimiter: "" }]) {
    const bad = structuredClone(w); Object.assign(bad.fields[0].recipe!, patch);
    expect(evaluate(bad, parse("Address\nx")).workflowIssues.length).toBeGreaterThan(0);
    expect(() => encodeWorkflow(bad)).toThrow();
  }
  for (const recipe of [
    { kind: "split", source: "address", output: "field-0", delimiter: ",", segments: 4, index: 0, trim: false, optionalEmpty: [] },
    { kind: "combine", components: [{ kind: "output", field: "field-0" }, { kind: "literal", text: "x" }], separator: " " },
    { kind: "combine", components: [{ kind: "literal", text: "x" }], separator: " " },
  ]) expect(() => decodeUsableWorkflow(JSON.stringify({ ...w, fields: [{ ...w.fields[0], recipe }] }))).toThrow();
});

test("splitting exposes formula-like text to the existing explicit CSV safety choice", () => {
  const w = split(); w.fields = [w.fields[1]];
  const run = evaluate(w, parse('Address\n"safe, =1+1, BC, V5K 0A1"'));
  expect(run.workflowIssues).toEqual([]);
  expect(run.rows[0].values.map(displayValue)).toEqual(["=1+1"]);
  expect(run.rows[0].issues).toContainEqual(expect.objectContaining({ code: "csv-risk", field: "field-1", source: "address" }));
  expect(() => serializeCsv(w, run, undefined)).toThrow(/Choose escaped/);
  expect(Buffer.from(serializeCsv(w, run, "raw")).toString()).toBe("City\r\n=1+1\r\n");
  expect(Buffer.from(serializeCsv(w, run, "escape")).toString()).toBe("City\r\n'=1+1\r\n");
});
