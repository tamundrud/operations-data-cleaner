import { expect, test } from "vitest";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { parseXlsx } from "../../src/formats/xlsx";
// @ts-expect-error U1's independently authored synthetic OOXML fixtures are JavaScript.
import { workbook, dates, fidelity, hostile, representative } from "../qualification/xlsx/fixtures.mjs";

function withHeaders(bytes: Uint8Array, count: number): Uint8Array {
  const parts = unzipSync(bytes);
  parts["xl/worksheets/sheet1.xml"] = strToU8(strFromU8(parts["xl/worksheets/sheet1.xml"]).replace(/<row r="1">.*?<\/row>/u,
    `<row r="1">${Array.from({ length: count }, (_, i) => `<c r="${String.fromCharCode(65 + i)}1" t="inlineStr"><is><t>Field ${i}</t></is></c>`).join("")}</row>`));
  return zipSync(parts);
}

test("requires worksheet selection and imports exactly the selected sheet", async () => {
  const bytes = withHeaders(fidelity, 14);
  expect(await parseXlsx(bytes, "d")).toEqual({ sheets: ["Synthetic", "Other"] });
  const result = await parseXlsx(bytes, "d", "Other");
  expect(result.table).toMatchObject({ worksheet: "Other", rows: [{ record: 2, line: 2, worksheet: "Other", cells: [{ raw: "99" }] }] });
  await expect(parseXlsx(bytes, "d", "Missing")).rejects.toThrow(/worksheet/i);
});

test("retains raw numeric, rendered identifiers, booleans, errors and formula provenance", async () => {
  const { table } = await parseXlsx(withHeaders(fidelity, 14), "d", "Synthetic");
  const cells = table!.rows[0].cells;
  expect(cells[0]).toMatchObject({ raw: "001234", display: "001234", excel: { type: "s", value: "001234" } });
  expect(cells[1]).toMatchObject({ raw: "1234", display: "001234", excel: { type: "n", value: 1234, format: "000000", date1904: false } });
  expect(cells[2].raw).toBe("1234567890123456");
  expect(cells[3].excel).toMatchObject({ type: "b", value: true });
  expect(cells[4].excel).toMatchObject({ type: "e" });
  expect(cells[5].raw).toBe("  U1_PRIVATE_SENTINEL  ");
  expect(cells[6].excel).toMatchObject({ unsupportedFormat: true, format: "[DBNum1]General" });
  expect(cells[7].excel).toMatchObject({ formula: expect.stringContaining("WEBSERVICE"), value: 7 });
  expect(cells[8].excel).toMatchObject({ formula: "1+2" });
  expect(cells[8].excel?.value).toBeUndefined();
  expect(cells[9].excel).toMatchObject({ type: "e", formula: "1/0" });
  expect(cells[10]).toMatchObject({ raw: "001234", excel: { formula: '"001234"', type: "s" } });
  expect(cells[12].excel?.formula).toBe("1+1");
  expect(cells[13].excel?.formula).toBe("1+1");
});

test.each([false, true])("uses the explicit workbook epoch %s without local Date conversion", async (epoch) => {
  const { table } = await parseXlsx(dates(epoch), "d", "Synthetic");
  const cells = table!.rows.map((row) => row.cells[0].excel!);
  expect(cells[0]).toMatchObject(epoch ? { date: { year: 1904, month: 1, day: 1 } } : { dateInvalid: true });
  expect(cells[3]).toMatchObject(epoch ? { date: { year: 1904, month: 3, day: 1 } } : { dateInvalid: true });
  expect(cells[7]).toMatchObject({ date: epoch ? { year: 2028, month: 3, day: 2 } : { year: 2024, month: 3, day: 1 } });
  for (const i of [9, 10, 11]) expect(cells[i]).toMatchObject({ dateInvalid: true });
});

test("preserves physical rows, blank counts, footer and first nonblank headers", async () => {
  const bytes = workbook('<row r="3"><c r="A3" t="inlineStr"><is><t> Ref </t></is></c></row><row r="4"><c r="A4" t="inlineStr"><is><t>001234</t></is></c></row><row r="6"><c r="A6" t="inlineStr"><is><t>Total</t></is></c></row>', { dimension: "A1:A6" });
  const { table } = await parseXlsx(bytes, "d", "Synthetic");
  expect(table).toMatchObject({ inputRows: 3, skippedBlanks: 1, columns: [{ header: " Ref ", key: "ref" }] });
  expect(table!.rows.map((r) => [r.id, r.record, r.line, r.cells[0].raw])).toEqual([["d:4", 4, 4, "001234"], ["d:6", 6, 6, "Total"]]);
  expect((await parseXlsx(bytes, "template", "Synthetic", true)).table).toMatchObject({ rows: [], inputRows: 3 });
});

test.each([['A', 'a'], ['A', ' ']])("rejects invalid normalized headers %s/%s", async (a, b) => {
  await expect(parseXlsx(workbook(`<row r="1"><c r="A1" t="inlineStr"><is><t>${a}</t></is></c><c r="B1" t="inlineStr"><is><t>${b}</t></is></c></row>`, { dimension: "A1:B1" }), "d", "Synthetic")).rejects.toThrow(/headers/i);
});

test("validates all data when importing header-only destination templates", async () => {
  await expect(parseXlsx(fidelity, "d", "Synthetic", true)).rejects.toThrow(/Extra cells/);
});

test("automatically selects a single worksheet and never changes the verified bytes", async () => {
  const parts = unzipSync(workbook('<row r="1"><c r="A1" t="inlineStr"><is><t>Code</t></is></c></row><row r="2"><c r="A2"><f>1-1</f><v>0</v></c></row>', { dimension: "A1:A2" }));
  parts["xl/workbook.xml"] = strToU8(strFromU8(parts["xl/workbook.xml"]).replace('<sheet name="Other" sheetId="2" r:id="rId2"/>', ""));
  const bytes = zipSync(parts), original = bytes.slice();
  const { table } = await parseXlsx(bytes, "d");
  expect(table!.worksheet).toBe("Synthetic");
  expect(table!.rows[0].cells[0]).toMatchObject({ raw: "0", excel: { type: "n", value: 0, formula: "1-1" } });
  // SheetJS may attach reader cursor helpers to the Uint8Array object; archive
  // content is the contract, and is compared independently byte for byte.
  expect(Array.from(bytes)).toEqual(Array.from(original));
});

test("rejects an empty worksheet rather than inventing headers", async () => {
  await expect(parseXlsx(workbook(""), "d", "Synthetic")).rejects.toThrow(/header/);
});

test("imports 10,000 rows and 20 columns without truncation", async () => {
  const { table } = await parseXlsx(representative(), "large", "Synthetic");
  expect(table!.rows).toHaveLength(10000);
  expect(table!.columns).toHaveLength(20);
  expect(table!.rows.at(-1)!.line).toBe(10001);
});

test("preflights every sheet before even listing worksheet choices", async () => {
  // The U1 bomb fixture expands 8 MiB and needs its qualified 1 MiB test budget;
  // that is intentionally within the production 100 MiB limit.
  for (const [name, bytes] of Object.entries(hostile()) as [string, Uint8Array][]) {
    if (name === "bomb") continue;
    await expect(parseXlsx(bytes, "d")).rejects.toThrow();
  }
  await expect(parseXlsx(new TextEncoder().encode("ID\n123"), "d")).rejects.toThrow();
});
