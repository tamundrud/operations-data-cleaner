import { exportRows } from "../engine/export-eligibility";
import Papa from "papaparse";
import { normalizeHeader, type Workflow } from "../engine/workflow";
import type { SourceTable } from "../engine/values";
import { displayValue } from "../engine/values";
import type { Run } from "../engine/recipes";
import { exportText, type SafetyChoice } from "./spreadsheet-safety";
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_CELLS = 2_000_000;
export function parseCsv(
  bytes: Uint8Array,
  delimiter: "auto" | "," | ";" | "\t",
  dataset: string,
  headersOnly = false,
): SourceTable {
  if (bytes.length > MAX_FILE_BYTES)
    throw new Error(
      "CSV exceeds 25 MiB. Split the source file into smaller tables. No data was imported.",
    );
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(
      "CSV is not valid UTF-8. Save as UTF-8 CSV and upload again.",
    );
  }
  if (text.includes("\0"))
    throw new Error(
      "CSV contains NUL characters. Save as UTF-8 CSV rather than UTF-16 or a binary file.",
    );
  const detected =
    delimiter === "auto"
      ? Papa.parse<string[]>(text, {
          delimitersToGuess: [",", ";", "\t"],
          preview: 10,
          skipEmptyLines: true,
          dynamicTyping: false,
          header: false,
        }).meta.delimiter
      : delimiter;
  if (![",", ";", "\t"].includes(detected))
    throw new Error(
      "Could not detect a supported delimiter. Select comma, semicolon or tab.",
    );
  // Papa tolerates quotes inside unquoted fields. Reject that ambiguity explicitly.
  let quoted = false,
    afterQuote = false,
    atStart = true,
    physicalLine = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') i++;
        else {
          quoted = false;
          afterQuote = true;
        }
      }
    } else if (c === detected || c === "\r" || c === "\n") {
      atStart = true;
      afterQuote = false;
    } else if (c === '"' && atStart) {
      quoted = true;
      atStart = false;
    } else {
      if (c === '"' || afterQuote)
        throw new Error(
          `Malformed CSV quotes at line ${physicalLine}. Quote the entire cell and double embedded quotes.`,
        );
      atStart = false;
    }
    if (c === "\n" || (c === "\r" && text[i + 1] !== "\n")) physicalLine++;
  }
  const table: SourceTable = {
    dataset,
    columns: [],
    rows: [],
    inputRows: 0,
    skippedBlanks: 0,
    delimiter: detected,
  };
  let record = 0,
    line = 1,
    cursor = 0,
    cells = 0,
    foundHeader = false;
  Papa.parse<string[]>(text, {
    delimiter: detected,
    dynamicTyping: false,
    header: false,
    skipEmptyLines: false,
    step(result) {
      const start = cursor,
        end = result.meta.cursor;
      const startLine = line;
      line += (text.slice(start, end).match(/\r\n|\r|\n/gu) ?? []).length;
      cursor = end;
      // Papa emits a final empty record after a terminal line ending: not a source row.
      if (
        start === text.length &&
        result.data.length === 1 &&
        result.data[0] === ""
      )
        return;
      record++;
      if (result.errors.length)
        throw new Error(
          `Malformed CSV at record ${record}, line ${startLine}. Check quotes and delimiters, then reupload.`,
        );
      cells += result.data.length;
      if (cells > MAX_CELLS)
        throw new Error(
          "CSV exceeds 2 million cells. Split the table into smaller files. No rows were truncated.",
        );
      if (result.data.every((c) => c === "")) {
        if (foundHeader) {
          table.inputRows++;
          table.skippedBlanks++;
        }
        return;
      }
      if (!foundHeader) {
        const keys = result.data.map(normalizeHeader);
        if (keys.some((k) => !k) || new Set(keys).size !== keys.length)
          throw new Error(
            `Blank or duplicate source headers at line ${startLine}. Give every column a unique nonempty name.`,
          );
        if (keys.length > 200)
          throw new Error(
            "CSV has more than 200 columns. Select a smaller source table.",
          );
        table.columns = result.data.map((header, position) => ({
          position,
          header,
          key: keys[position],
        }));
        foundHeader = true;
        return;
      }
      table.inputRows++;
      if (result.data.length > table.columns.length)
        throw new Error(
          `Extra cells at record ${record}, line ${startLine}. Check the delimiter and quote cells containing delimiters.`,
        );
      if (!headersOnly)
        table.rows.push({
          id: `${dataset}:${record}`,
          record,
          line: startLine,
          cells: result.data.map((raw) => ({
            kind: "text",
            raw,
            display: raw,
          })),
        });
    },
  });
  if (!foundHeader)
    throw new Error(
      "CSV has no header row. Add unique column names and upload again.",
    );
  return table;
}
export function serializeCsv(
  workflow: Workflow,
  run: Run,
  choice: SafetyChoice,
  partialAcknowledged = false,
): Uint8Array {
  const rows = exportRows(run, partialAcknowledged);
  if ((run.csvRisk || run.riskyHeaders.length) && !choice)
    throw new Error(
      "Choose escaped output or raw TMS text before downloading formula-like content.",
    );
  const records = [
    ...(workflow.output.header
      ? [workflow.fields.map((f) => exportText(f.header, choice))]
      : []),
    ...rows.map((r) =>
      r.values.map((v) =>
        v.kind === "text" ? exportText(v.text, choice) : displayValue(v),
      ),
    ),
  ];
  return new TextEncoder().encode(
    (workflow.output.bom ? "\ufeff" : "") +
    Papa.unparse(records, { delimiter: workflow.output.delimiter, newline: "\r\n", quotes: false }) +
      "\r\n",
  );
}
