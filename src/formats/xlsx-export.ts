import { exportRows } from "../engine/export-eligibility";
import Big from "big.js";
import * as XLSX from "xlsx";
import type { Run } from "../engine/recipes";
import type { Workflow } from "../engine/workflow";
import type { Value } from "../engine/values";
import type { CalendarDate, DatePattern } from "../engine/dates";

const DATE_FORMATS: Record<DatePattern, string> = {
  "YYYY-MM-DD": "yyyy-mm-dd",
  "MM/DD/YYYY": "mm/dd/yyyy",
  "DD/MM/YYYY": "dd/mm/yyyy",
};
const MAX_OUTPUT_CELLS = 2_000_000;
const MAX_SERIALIZATION_BYTES = 100 * 1024 * 1024;

function numericValue(decimal: string): number {
  const exact = new Big(decimal.startsWith("+") ? decimal.slice(1) : decimal);
  const number = Number(decimal);
  // Excel supports 15 significant decimal digits and normal IEEE-754 values.
  // Compare the decimal value that will actually be written, not a rounded preview.
  if (exact.c.length > 15 || !Number.isFinite(number) ||
    (!exact.eq(0) && (Math.abs(number) < 2.2250738585072014e-308 || exact.abs().gt("9.99999999999999e307"))) ||
    !exact.eq(String(number)))
    throw new Error("Number cannot be represented faithfully in Excel (15 significant digits and supported numeric range). Use CSV or explicitly change the output to text.");
  return number === 0 ? 0 : number;
}

function ordinal({ year, month, day }: CalendarDate): number {
  const prior = year - 1;
  let days = prior * 365 + Math.floor(prior / 4) - Math.floor(prior / 100) + Math.floor(prior / 400) + day;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const months = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let m = 1; m < month; m++) days += months[m - 1];
  return days;
}

function dateSerial(date: CalendarDate, system: Workflow["output"]["dateSystem"]): number {
  const serial = ordinal(date) - ordinal(system === "1904" ? { year: 1904, month: 1, day: 1 } : { year: 1899, month: 12, day: 31 });
  if (serial < (system === "1904" ? 0 : 1))
    throw new Error(`Date predates the ${system} Excel calendar. Use CSV, text output, or an earlier Excel date system.`);
  // Excel's 1900 calendar includes a fictitious leap day at serial 60.
  return system === "1900" && serial >= 60 ? serial + 1 : serial;
}

function cell(value: Value, workflow: Workflow): XLSX.CellObject | undefined {
  switch (value.kind) {
    case "blank": return undefined;
    case "text":
      if (value.text.length > 32767)
        throw new Error("Text exceeds Excel's 32767-character cell limit. Use CSV or shorten the configured output; no text was truncated.");
      if (/[\uD800-\uDFFF]/u.test(value.text))
        throw new Error("Text contains an unpaired Unicode surrogate. Correct the text in the source or fixed value before exporting.");
      // SheetJS escapes XML/control characters but leaves literal OOXML escape
      // tokens unprotected. Encode their initial underscore exactly once.
      {
        const text = value.text.replace(/_(?=x[0-9a-f]{4}_)/giu, "_x005F_");
        if (text.length > 32767)
          throw new Error("Escaped text exceeds the Excel writer's 32767-character limit. Use CSV or shorten the configured output; no text was truncated.");
        return { t: "s", v: text };
      }
    case "number": return { t: "n", v: numericValue(value.decimal) };
    case "date": return { t: "n", v: dateSerial(value, workflow.output.dateSystem), z: DATE_FORMATS[value.format] };
  }
}

/** Fresh, value-only OOXML. Source cells and their active metadata never enter this adapter. */
export function serializeXlsx(workflow: Workflow, run: Run, partialAcknowledged = false): Uint8Array {
  const eligible = exportRows(run, partialAcknowledged);
  const offset = workflow.output.header ? 1 : 0;
  const rows = eligible.length + offset, columns = workflow.fields.length;
  if (rows > 1048576)
    throw new Error("Excel output exceeds 1048576 rows including its header. Split the source into smaller tables or use CSV. No rows were truncated.");
  if (rows * columns > MAX_OUTPUT_CELLS)
    throw new Error("Excel output exceeds 2 million table cells. Select fewer output columns or split the source into smaller files. No data was truncated.");

  // Bound amplification before allocating the worksheet. 128 bytes per position
  // covers cell/row tags, addresses and styles; UTF-8 text can expand at most 7x
  // through XML/control escaping. Reserve 64 KiB for fixed package metadata.
  let budget = 65536 + rows * columns * 128;
  const encoder = new TextEncoder();
  const sheet: XLSX.WorkSheet = {};
  function put(value: Value, row: number, col: number, context: string) {
    try {
      const output = cell(value, workflow);
      if (value.kind === "text") budget += encoder.encode(value.text).length * 7;
      if (budget > MAX_SERIALIZATION_BYTES)
        throw new Error("Excel output exceeds the 100 MiB serialization budget. Select fewer columns or split into smaller files. No data was truncated.");
      if (output) sheet[XLSX.utils.encode_cell({ r: row, c: col })] = output;
    } catch (error) {
      throw new Error(`${context}: ${error instanceof Error ? error.message : "Excel serialization failed."}`, { cause: error });
    }
  }
  if (workflow.output.header) workflow.fields.forEach((field, c) => put({ kind: "text", text: field.header }, 0, c, `Header ${field.header}`));
  eligible.forEach((row, r) => row.values.forEach((value, c) => put(value, r + offset, c, `Source record ${row.record}, line ${row.line}, ${workflow.fields[c].header}`)));
  // Explicit extent preserves trailing columns and entirely blank output rows.
  sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows - 1, c: columns - 1 } });
  // SheetJS otherwise inherits its process-global SSF table, which source
  // imports populate with arbitrary custom formats, even for unused cells.
  const workbook = {
    ...XLSX.utils.book_new(),
    SSF: { 0: "General", ...Object.fromEntries(Object.values(DATE_FORMATS).map((format, index) => [164 + index, format])) },
  };
  workbook.Workbook = { WBProps: { date1904: workflow.output.dateSystem === "1904" } };
  XLSX.utils.book_append_sheet(workbook, sheet, "Output");
  // Shared strings also avoid SheetJS's double escape-decoding of t="str" cells
  // when this fresh workbook is used as the next run's source.
  return new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx", compression: true, bookSST: true }));
}
