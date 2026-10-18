import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { decodeWorkflow, makeWorkflow, type Workflow } from "../../src/engine/workflow";
import { decodeUsableWorkflow, encodeWorkflow, snapshotWorkflow } from "../../src/workflows/codec";
import { evaluate } from "../../src/engine/recipes";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
const goldenJson = readFileSync("tests/fixtures/workflows/u4-supported.json", "utf8");
const golden = () => decodeWorkflow(goldenJson);
const source = new TextEncoder().encode("Order,Consignee\r\n001234,  Acme  \r\n");
const reopen = (w: Workflow) => decodeUsableWorkflow(encodeWorkflow(w));

test("configuration round trip preserves independent golden meaning and exported bytes", () => {
  const w = decodeUsableWorkflow(goldenJson);
  expect(reopen(w)).toEqual(w);
  const run = evaluate(reopen(w), parseCsv(source, w.source.delimiter, "new-source"));
  expect(run.workflowIssues).toEqual([]);
  expect(Buffer.from(serializeCsv(w, run, undefined))).toEqual(readFileSync("tests/fixtures/workflows/u4-expected.csv"));
});

test("all source policies and twelve CSV setting combinations preserve independently expected bytes", () => {
  for (const policy of ["auto", ",", ";", "\t"] as const) {
    for (const delimiter of [",", ";", "\t"] as const) {
      for (const bom of [false, true]) for (const header of [false, true]) {
        const w = golden();
        w.source.delimiter = policy;
        w.output = { ...w.output, delimiter, bom, header };
        const restored = reopen(w);
        expect(restored).toEqual(w);
        const inputDelimiter = policy === "auto" ? ";" : policy;
        const input = new TextEncoder().encode(`Order${inputDelimiter}Consignee\r\n001234${inputDelimiter}  Acme  \r\n`);
        const run = evaluate(restored, parseCsv(input, policy, "repeat"));
        // Literal expected cells and quoting rules, independent of parse/serialize round trips.
        const cells = ['001234', '0012', 'Acme', '12.50', '', '001234', '" café,""quoted""\nnext\tend "', '-999999999999999999999.0001'];
        const expected = (bom ? "\ufeff" : "") + (header ? ['Reference','CustomerCode','Consignee','Weight','OptionalNote','Again','Literal','Signed'].join(delimiter) + '\r\n' : '') + cells.join(delimiter) + '\r\n';
        expect(Buffer.from(serializeCsv(restored, run, undefined))).toEqual(Buffer.from(expected));
      }
    }
  }
});

test("untrusted JSON rejects versions, budgets, nested injection and malformed recipes", () => {
  for (const version of [0, 2, undefined]) {
    expect(() => decodeUsableWorkflow(JSON.stringify({ ...golden(), version }))).toThrow(/version|structure/);
  }
  expect(() => decodeUsableWorkflow("{" )).toThrow(/JSON/);
  expect(() => decodeUsableWorkflow(' '.repeat(1024 * 1024 + 1))).toThrow(/1 MiB/);
  expect(() => decodeUsableWorkflow('['.repeat(21) + '0' + ']'.repeat(21))).toThrow(/nesting/);
  for (const injected of [
    { ...golden(), session: { rows: ['private'] } },
    { ...golden(), source: { ...golden().source, filename: 'private.csv' } },
    { ...golden(), output: { ...golden().output, safetyChoice: 'raw' } },
    { ...golden(), fields: [{ ...golden().fields[0], sample: 'private' }] },
    { ...golden(), fields: [{ ...golden().fields[0], recipe: { kind: 'script', code: '1' } }] },
    { ...golden(), fields: [{ ...golden().fields[0], recipe: { kind: 'constant', value: { kind: 'number', decimal: 'NaN' } } }] },
  ]) expect(() => decodeUsableWorkflow(JSON.stringify(injected))).toThrow(/structure/);
});

test("declared future capabilities decode structurally but fail the usable boundary", () => {
  const variants: Workflow[] = [];
  variants.push({ ...golden(), output: { ...golden().output, format: 'xlsx' } });
  for (const w of variants) expect(() => decodeUsableWorkflow(JSON.stringify(w))).toThrow(/unsupported/i);
});

test("usable configuration rejects unfinished, conflicting and inconsistent declarations", () => {
  const bad: Workflow[] = [];
  const unmapped = golden(); delete unmapped.fields[0].recipe; bad.push(unmapped);
  const duplicate = golden(); duplicate.fields[1].id = duplicate.fields[0].id; bad.push(duplicate);
  const names = golden(); names.fields[1].header = ' reference '; bad.push(names);
  const blank = golden(); blank.fields[0].header = '  '; bad.push(blank);
  for (const change of [{ type: 'text' as const }, { trim: true }, { maxLength: 3 }]) {
    const w = golden(); Object.assign(w.fields[3], change); bad.push(w);
  }
  for (const refs of [[], ['order'], ['order','consignee','extra'], ['order','consignee','order']])
    bad.push({ ...golden(), source: { ...golden().source, referencedHeaders: refs } });
  for (const w of bad) expect(() => decodeUsableWorkflow(JSON.stringify(w))).toThrow(/configuration/i);
  const reordered = golden(); reordered.source.referencedHeaders.reverse();
  expect(decodeUsableWorkflow(JSON.stringify(reordered))).toEqual(reordered);
});

test("snapshots canonicalize references, detach runtime data, and keep constants literal", () => {
  const w = Object.assign(golden(), { filename: 'private.csv', rows: ['source-only'], safetyChoice: 'raw' });
  w.source.referencedHeaders = [];
  const snapshot = snapshotWorkflow(w);
  expect(snapshot).toEqual(golden());
  w.fields[0].header = 'changed';
  expect(snapshot.fields[0].header).toBe('Reference');
  expect(encodeWorkflow(snapshot)).not.toMatch(/private|source-only|safetyChoice/);
  const constants = makeWorkflow(['Formula', 'Required blank']);
  constants.fields[0].recipe = { kind: 'constant', value: { kind: 'text', text: '=HYPERLINK("literal")' } };
  constants.fields[1].recipe = { kind: 'constant', value: { kind: 'blank' } };
  constants.fields[1].required = true;
  expect(reopen(constants)).toEqual(constants);
  expect(reopen(constants).source.referencedHeaders).toEqual([]);
  expect(evaluate(constants, parseCsv(source, ',', 'source')).summary.invalid).toBe(1);
  const formulaOnly = { ...constants, fields: [constants.fields[0]] };
  const restored = reopen(formulaOnly);
  const run = evaluate(restored, parseCsv(source, ',', 'source'));
  expect(() => serializeCsv(restored, run, undefined)).toThrow(/Choose escaped/);
});

test("encoded snapshots enforce byte limits even when each individual setting is bounded", () => {
  const w = makeWorkflow(Array.from({ length: 200 }, (_, i) => `Column ${i}`));
  w.fields.forEach((f) => { f.header += 'é'.repeat(2000); f.recipe = { kind: 'constant', value: { kind: 'text', text: 'é'.repeat(4000) } }; });
  expect(() => encodeWorkflow(w)).toThrow(/1 MiB/);
});

test("pretty-printed portable bytes also stay within the import budget", () => {
  const w = makeWorkflow(Array.from({ length: 200 }, (_, i) => `Column ${i} ${'x'.repeat(901)}`));
  w.fields.forEach((f) => { f.recipe = { kind: 'constant', value: { kind: 'text', text: 'x'.repeat(4096) } }; });
  expect(Buffer.byteLength(JSON.stringify(w))).toBeLessThanOrEqual(1024 * 1024);
  expect(Buffer.byteLength(JSON.stringify(w, null, 2))).toBeGreaterThan(1024 * 1024);
  expect(() => encodeWorkflow(w)).toThrow(/1 MiB/);
});

test("Excel worksheet and explicit date interpretation survive portable round trip", () => {
  const w = golden();
  w.source = { ...w.source, format: 'xlsx', worksheet: 'Orders' };
  w.fields[0] = { ...w.fields[0], type: 'date', date: { source: 'excel', target: 'YYYY-MM-DD' } };
  expect(reopen(w)).toEqual(w);
  expect(encodeWorkflow(w)).not.toMatch(/filename|sampleRows/);
});
