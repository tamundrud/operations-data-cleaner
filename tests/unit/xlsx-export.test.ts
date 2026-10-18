import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import * as XLSX from "xlsx";
import { strFromU8, unzipSync } from "fflate";
import { serializeXlsx } from "../../src/formats/xlsx-export";
import { parseCsv } from "../../src/formats/csv";
import { parseXlsx } from "../../src/formats/xlsx";
import { evaluate } from "../../src/engine/recipes";
import { makeWorkflow, referencedHeaders, type Workflow } from "../../src/engine/workflow";
import { decodeUsableWorkflow, encodeWorkflow } from "../../src/workflows/codec";
// @ts-expect-error Independently authored U1 OOXML fixture builder.
import { workbook } from "../qualification/xlsx/fixtures.mjs";

const source = () => parseCsv(new TextEncoder().encode("ID,Amount,Date,Unused\n001234,0.3,2024-02-29,PRIVATE_UNUSED"), ",", "synthetic");
function config() {
  const w = makeWorkflow(["=Reference", "Amount", "Delivery", "Blank", "Literal"]);
  w.output.format = "xlsx";
  w.fields[0].recipe = { kind: "copy", source: "id" };
  w.fields[1] = { ...w.fields[1], type: "number", recipe: { kind: "copy", source: "amount" } };
  w.fields[2] = { ...w.fields[2], type: "date", date: { source: "YYYY-MM-DD", target: "DD/MM/YYYY" }, recipe: { kind: "copy", source: "date" } };
  w.fields[3].recipe = { kind: "constant", value: { kind: "blank" } };
  w.fields[4].recipe = { kind: "constant", value: { kind: "text", text: '=HYPERLINK("https://example.invalid","literal")' } };
  return w;
}
function write(w = config()) { return serializeXlsx(w, evaluate(w, source())); }
function xml(bytes: Uint8Array) {
  return Object.fromEntries(Object.entries(unzipSync(bytes)).map(([name, data]) => [name, strFromU8(data)]));
}
function sharedStrings(parts: Record<string, string>): string[] {
  return [...(parts["xl/sharedStrings.xml"] ?? "").matchAll(/<si><t[^>]*>([\s\S]*?)<\/t><\/si>/gu)].map((match) => match[1]);
}

test("fresh workbook ZIP/XML matches independent semantic golden, with no active content", () => {
  const bytes = write(), parts = xml(bytes), sheet = parts["xl/worksheets/sheet1.xml"];
  const golden = JSON.parse(readFileSync("tests/fixtures/xlsx/u10-output.json", "utf8")) as { cells: Record<string, { type: string; value: string }>; absent: string[] };
  for (const [ref, cell] of Object.entries(golden.cells)) {
    const node = new RegExp(`<c\\b[^>]*\\br="${ref}"[^>]*>[\\s\\S]*?</c>`, "u").exec(sheet)?.[0];
    expect(node, ref).toBeDefined();
    if (cell.type === "text") {
      expect(node).toMatch(/\bt="s"/u);
      const index = Number(/<v>(\d+)<\/v>/u.exec(node!)![1]);
      expect(sharedStrings(parts)[index]).toBe(cell.value);
    } else {
      expect(node).not.toMatch(/\bt="(?:str|inlineStr|s)"/u);
      expect(node).toContain(`<v>${cell.value}</v>`);
    }
  }
  for (const ref of golden.absent) expect(sheet).not.toMatch(new RegExp(`<c\\b[^>]*\\br="${ref}"`, "u"));
  expect(sheet).toContain('ref="A1:E2"');
  expect(parts["xl/styles.xml"]).toContain("dd/mm/yyyy");
  // OOXML defaults to the 1900 calendar when date1904 is omitted.
  expect(parts["xl/workbook.xml"]).not.toMatch(/date1904="(?:true|1)"/u);
  for (const [name, content] of Object.entries(parts)) {
    expect(name).not.toMatch(/vba|externalLinks|hyperlinks|comments|sheet.*\.rels/iu);
    expect(content).not.toMatch(/<f[\s>]|<hyperlink\b|TargetMode="External"|PRIVATE_UNUSED/u);
  }
  const book = XLSX.read(bytes, { type: "array", cellNF: true, cellDates: false });
  expect(book.Sheets.Output.A2).toMatchObject({ t: "s", v: "001234" });
  expect(book.Sheets.Output.B2).toMatchObject({ t: "n", v: 0.3 });
  expect(book.Sheets.Output.C2).toMatchObject({ t: "n", v: 45351, z: "dd/mm/yyyy" });
  expect(book.Sheets.Output.E2.f).toBeUndefined();
});

test("zero-padded numeric Excel identifiers become literal strings in the fresh workbook", async () => {
  const input = workbook('<row r="1"><c r="A1" t="inlineStr"><is><t>ID</t></is></c></row><row r="2"><c r="A2" s="1"><v>1234</v></c></row>', { dimension: "A1:A2" });
  const { table } = await parseXlsx(input, "padded", "Synthetic");
  const w = config(); w.fields = [w.fields[0]];
  const bytes = serializeXlsx(w, evaluate(w, table!));
  const parts = xml(bytes);
  expect(parts["xl/worksheets/sheet1.xml"]).toMatch(/r="A2" t="s"/u);
  expect(sharedStrings(parts)).toContain("001234");
  expect(XLSX.read(bytes, { type: "array" }).Sheets.Output.A2).toMatchObject({ t: "s", v: "001234" });
});

test("source custom number formats cannot leak through SheetJS global state into fresh exports", async () => {
  const marker = "PRIVATE_U10_SOURCE_FORMAT";
  const input = workbook('<row r="1"><c r="A1" t="inlineStr"><is><t>ID</t></is></c></row><row r="2"><c r="A2"><v>12</v></c></row>', {
    dimension: "A1:A2", extra: { "xl/styles.xml": `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;${marker}&quot;0"/></numFmts><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0"/></cellXfs></styleSheet>` },
  });
  await parseXlsx(input, "format-source", "Synthetic");
  const parts = xml(write());
  expect(Object.values(parts).join("\n")).not.toContain(marker);
  expect(parts["xl/styles.xml"]).toContain('formatCode="dd/mm/yyyy"');
});

test.each(["0", "-0", "+0.3000", "12.50", "-999999999999999", "1000000000000000", "0." + "0".repeat(306) + "1"])("exports faithful Excel numeric value %s", (decimal) => {
  const w = config(); w.fields = [{ ...w.fields[1], recipe: { kind: "constant", value: { kind: "number", decimal } } }];
  expect(XLSX.read(write(w), { type: "array" }).Sheets.Output.A2.v).toBe(Number(decimal) || 0);
});

test.each(["1234567890123456", "0.10000000000000001", "9007199254740993", "1" + "0".repeat(308), "0." + "0".repeat(308) + "1", "0." + "0".repeat(323) + "1", "0." + "0".repeat(400) + "1"])("rejects numeric precision/range loss %s with row/field and alternatives", (decimal) => {
  const w = config(); w.fields = [{ ...w.fields[1], recipe: { kind: "constant", value: { kind: "number", decimal } } }];
  expect(() => write(w)).toThrow(/record 2.*Amount.*CSV.*text/iu);
});

test.each(["1900", "1904"] as const)("calendar dates and number formats use deliberate %s epoch", async (dateSystem) => {
  const w = config(); w.output.dateSystem = dateSystem;
  const bytes = write(w), parts = xml(bytes);
  expect(parts["xl/worksheets/sheet1.xml"]).toContain(`<v>${dateSystem === "1900" ? 45351 : 43889}</v>`);
  if (dateSystem === "1904") expect(parts["xl/workbook.xml"]).toContain('date1904="true"');
  else expect(parts["xl/workbook.xml"]).not.toMatch(/date1904="(?:true|1)"/u);
  const { table } = await parseXlsx(bytes, "again");
  expect(table!.rows[0].cells[2].excel?.date).toEqual({ year: 2024, month: 2, day: 29 });
});

test.each([["1900", "1900-01-01", 1], ["1900", "1900-02-28", 59], ["1900", "1900-03-01", 61], ["1904", "1904-01-01", 0], ["1900", "9999-12-31", 2958465]] as const)("date boundary %s %s writes %s", (dateSystem, date, serial) => {
  const w = config(); w.output.dateSystem = dateSystem;
  w.fields = [{ ...w.fields[2], recipe: { kind: "constant", value: { kind: "text", text: date } } }];
  expect(xml(write(w))["xl/worksheets/sheet1.xml"]).toContain(`<v>${serial}</v>`);
});

test.each([["YYYY-MM-DD", "yyyy-mm-dd"], ["MM/DD/YYYY", "mm/dd/yyyy"], ["DD/MM/YYYY", "dd/mm/yyyy"]] as const)("date display %s writes explicit %s format without changing its serial", (target, format) => {
  const w = config(); w.fields = [{ ...w.fields[2], date: { source: "YYYY-MM-DD", target } }];
  const parts = xml(write(w));
  expect(parts["xl/styles.xml"]).toContain(`formatCode="${format}"`);
  expect(parts["xl/worksheets/sheet1.xml"]).toContain("<v>45351</v>");
});

test("Excel row limit includes the optional header and rejects before worksheet allocation", () => {
  const w = config(); w.fields = [w.fields[0]];
  const run = evaluate(w, source()); run.rows = Array(1048576).fill(run.rows[0]);
  expect(() => serializeXlsx(w, run)).toThrow(/1048576 rows.*CSV/u);
});

test.each(["0001-01-01", "1899-12-31"])("pre-epoch dates %s fail without changing calendar meaning", (date) => {
  const w = config(); w.fields = [{ ...w.fields[2], recipe: { kind: "constant", value: { kind: "text", text: date } } }];
  expect(() => write(w)).toThrow(/Delivery.*CSV.*text/u);
});

test("selected field order and header-free export retain trailing and all-blank rows", () => {
  const w = config(); w.output.header = false; w.fields = [w.fields[4], w.fields[0], w.fields[3]];
  let parts = xml(write(w));
  expect(parts["xl/worksheets/sheet1.xml"]).toContain('ref="A1:C1"');
  expect(parts["xl/worksheets/sheet1.xml"]).toMatch(/r="B1" t="s"><v>\d+<\/v>/u);
  expect(sharedStrings(parts)).toContain("001234");
  w.fields = [config().fields[2], config().fields[3]];
  w.fields[0].recipe = { kind: "constant", value: { kind: "blank" } };
  parts = xml(write(w));
  expect(parts["xl/worksheets/sheet1.xml"]).toContain('ref="A1:B1"');
  expect(parts["xl/worksheets/sheet1.xml"]).not.toMatch(/<v>/u);
});

test("XLSX format and every destination type survive version-1 saved/portable codec", () => {
  for (const dateSystem of ["1900", "1904"] as const) for (const header of [false, true]) {
    const w = config(); w.output = { ...w.output, dateSystem, header, bom: true, delimiter: ";" };
    w.source.referencedHeaders = referencedHeaders(w.fields);
    const restored = decodeUsableWorkflow(encodeWorkflow(w));
    expect(restored).toEqual(w);
    expect(xml(write(restored))).toEqual(xml(write(w)));
  }
});

test("existing invalid, workflow-error and zero-row eligibility remains blocking", () => {
  const w = config(); w.fields[0].required = true; w.fields[0].recipe = { kind: "constant", value: { kind: "blank" } };
  expect(() => write(w)).toThrow(/blocked/iu);
  w.fields[0].recipe = undefined;
  expect(() => write(w)).toThrow(/blocked/iu);
  const good = config();
  expect(() => serializeXlsx(good, evaluate(good, { ...source(), rows: [] }))).toThrow(/blocked/iu);
});

test("amplified output is rejected before exceeding 2 million table cells", () => {
  const w = config(), run = evaluate(w, source());
  run.rows = Array(400001).fill(run.rows[0]);
  expect(() => serializeXlsx(w, run)).toThrow(/2 million.*smaller/iu);
});

test("oversized text never silently truncates to Excel's cell limit", () => {
  const w: Workflow = config();
  const text = "x".repeat(32768);
  const table = parseCsv(new TextEncoder().encode(`ID\n${text}`), ",", "long");
  w.fields = [w.fields[0]];
  expect(() => serializeXlsx(w, evaluate(w, table))).toThrow(/32767.*CSV/iu);
});

test.each(["001234", "=1+1", "+SUM(A1)", "-2", "@SUM(A1)", " \t=1+1", "\r=1+1", "_x0041_", "_x005F_x0041_", "_X000a_", "a\r\nb", "<tag>&\"café\""])("literal text %j remains string data without formulas", (text) => {
  const w = config(); w.fields = [{ ...w.fields[0], recipe: { kind: "constant", value: { kind: "text", text } } }];
  const bytes = write(w), parts = xml(bytes), sheet = parts["xl/worksheets/sheet1.xml"];
  expect(sheet).not.toMatch(/<f[\s>]/u);
  const index = Number(/<c r="A2"[^>]*><v>(\d+)<\/v><\/c>/u.exec(sheet)![1]);
  const encoded = sharedStrings(parts)[index];
  const entities: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
  const decoded = encoded.replace(/&(?:amp|lt|gt|quot|apos);/gu, (token) => entities[token]).replace(/_x([0-9a-f]{4})_/giu, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  expect(decoded).toBe(text);
  // The reader intentionally normalizes CRLF after decoding. Raw XML above is
  // the fidelity authority; this supplemental check does not hide that behavior.
  expect(XLSX.read(bytes, { type: "array" }).Sheets.Output.A2).toMatchObject({ t: "s", v: text.replace(/\r\n/gu, "\n") });
});

test("unpaired Unicode is rejected rather than silently replaced during UTF-8 writing", () => {
  const w = config(); w.fields = [{ ...w.fields[0], recipe: { kind: "constant", value: { kind: "text", text: "\ud800" } } }];
  expect(() => write(w)).toThrow(/Unicode surrogate/u);
});

test("OOXML token protection cannot silently exceed the writer's own cell length limit", () => {
  const w = config(); w.fields = [w.fields[0]];
  const table = parseCsv(new TextEncoder().encode("ID\n" + "_x0041_".repeat(4000)), ",", "escaped");
  expect(() => serializeXlsx(w, evaluate(w, table))).toThrow(/Escaped text.*32767.*CSV/u);
});

test("exact decimal arithmetic serializes 0.1 + 0.2 as numeric 0.3", () => {
  const w = config(); w.fields = [{ ...w.fields[1], recipe: { kind: "calculate", operation: "add", left: { kind: "number", decimal: "0.1" }, right: { kind: "number", decimal: "0.2" } } }];
  expect(xml(write(w))["xl/worksheets/sheet1.xml"]).toContain("<v>0.3</v>");
});

test("output text amplification fails within the serialization budget without allocating a whole workbook", () => {
  const w = config(); w.fields = Array.from({ length: 200 }, (_, i) => ({ ...w.fields[0], id: `f-${i}`, header: `F${i}` }));
  const table = parseCsv(new TextEncoder().encode("ID\n" + Array(100).fill("x".repeat(4096)).join("\n")), ",", "large");
  expect(() => serializeXlsx(w, evaluate(w, table))).toThrow(/100 MiB.*smaller/iu);
});
