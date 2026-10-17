import * as XLSX from "xlsx";
import { normalizeHeader } from "../engine/workflow";
import type { SourceRow, SourceTable } from "../engine/values";
import { preflight } from "./archive-budget";

type SourceCell = SourceRow["cells"][number];

function sourceCell(cell: XLSX.CellObject | undefined, date1904: boolean): SourceCell {
  if (!cell) return { kind: "text", raw: "", display: "" };
  // SheetJS supplies v:0 for formula-only stubs; it is not a cached result.
  const value = cell.t !== "z" && (typeof cell.v === "string" || typeof cell.v === "number" || typeof cell.v === "boolean") ? cell.v : undefined;
  const format = typeof cell.z === "string" ? cell.z : undefined;
  const isDate = !!format && XLSX.SSF.is_date(format);
  const excel: NonNullable<SourceCell["excel"]> = {
    type: cell.t,
    ...(value !== undefined ? { value } : {}),
    ...(format !== undefined ? { format } : {}),
    ...(cell.f !== undefined ? { formula: cell.f } : {}),
    date1904,
  };
  if (cell.t === "n" && isDate) {
    // Calendar components, never local JavaScript Dates. Day 60 in the 1900
    // epoch is Excel's fictitious leap day; fractional serials contain time.
    const date = typeof value === "number" && Number.isInteger(value) && value >= 0 && (date1904 || (value !== 0 && value !== 60))
      ? XLSX.SSF.parse_date_code(value, { date1904 }) as { y: number; m: number; d: number } | null
      : null;
    if (date && date.y >= 1 && date.y <= 9999 && date.m >= 1 && date.m <= 12 && date.d >= 1 && date.d <= 31)
      excel.date = { year: date.y, month: date.m, day: date.d };
    else excel.dateInvalid = true;
  }
  if (format && format !== "General" && format !== "@" && !/^0+$/u.test(format) && !isDate)
    excel.unsupportedFormat = true;
  const raw = value === undefined ? "" : String(value);
  return { kind: "text", raw, display: cell.w ?? raw, excel };
}

function nonblank(cell: SourceCell) {
  return cell.raw !== "" || cell.excel?.formula !== undefined || cell.excel?.type === "e";
}

/** Validate the complete unchanged archive before inspecting or parsing any sheet. */
export async function parseXlsx(
  bytes: Uint8Array,
  dataset: string,
  worksheet?: string,
  headersOnly = false,
): Promise<{ sheets: string[]; table?: SourceTable }> {
  await preflight(bytes);
  let names: string[];
  try {
    names = XLSX.read(bytes, { type: "array", bookSheets: true, cellHTML: false }).SheetNames;
  } catch {
    throw new Error("Cannot read this Excel workbook. Save an ordinary unencrypted .xlsx table or use UTF-8 CSV. No data was imported.");
  }
  if (!names.length) throw new Error("Workbook has no worksheets. Add a table with unique column headers.");
  if (worksheet === undefined && names.length > 1) return { sheets: names };
  const selected = worksheet ?? names[0];
  if (!names.includes(selected)) throw new Error("Selected worksheet is missing. Choose an available worksheet.");
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array", cellNF: true, cellText: true, cellFormula: true,
      cellDates: false, sheetStubs: true, cellHTML: false, sheets: [selected],
    });
  } catch {
    throw new Error("Cannot parse the selected Excel worksheet. Save an ordinary .xlsx table or use UTF-8 CSV. No data was imported.");
  }
  const sheet = workbook.Sheets[selected];
  if (!sheet || !sheet["!ref"]) throw new Error("Worksheet has no header row. Add unique column names.");
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const date1904 = !!workbook.Workbook?.WBProps?.date1904;
  const table: SourceTable = { dataset, worksheet: selected, columns: [], rows: [], inputRows: 0, skippedBlanks: 0, delimiter: "" };
  for (let row = range.s.r; row <= range.e.r; row++) {
    const cells: SourceCell[] = [];
    for (let col = 0; col <= range.e.c; col++)
      cells.push(sourceCell(sheet[XLSX.utils.encode_cell({ r: row, c: col })], date1904));
    let last = cells.length - 1;
    while (last >= 0 && !nonblank(cells[last])) last--;
    if (last < 0) {
      if (table.columns.length) { table.inputRows++; table.skippedBlanks++; }
      continue;
    }
    if (!table.columns.length) {
      const headers = cells.slice(0, last + 1).map((cell) => cell.display);
      const keys = headers.map(normalizeHeader);
      if (keys.some((key) => !key) || new Set(keys).size !== keys.length)
        throw new Error(`Blank or duplicate source headers at worksheet row ${row + 1}. Give every column a unique nonempty name.`);
      if (headers.length > 200) throw new Error("Excel table has more than 200 columns. Select a smaller source table.");
      table.columns = headers.map((header, position) => ({ header, position, key: keys[position] }));
      continue;
    }
    table.inputRows++;
    if (last >= table.columns.length) throw new Error(`Extra cells at worksheet row ${row + 1}. Give every data column a header. No rows were truncated.`);
    if (!headersOnly) table.rows.push({
      id: `${dataset}:${row + 1}`, record: row + 1, line: row + 1, worksheet: selected,
      cells: cells.slice(0, table.columns.length),
    });
  }
  if (!table.columns.length) throw new Error("Worksheet has no header row. Add unique column names.");
  return { sheets: names, table };
}
