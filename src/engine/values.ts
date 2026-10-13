export type Value =
  | { kind: "blank" }
  | { kind: "text"; text: string }
  | { kind: "number"; decimal: string }
  | { kind: "date"; year: number; month: number; day: number };
export type SourceColumn = { position: number; header: string; key: string };
export type SourceRow = {
  id: string;
  record: number;
  line: number;
  cells: { kind: "text"; raw: string; display: string }[];
};
export type SourceTable = {
  dataset: string;
  columns: SourceColumn[];
  rows: SourceRow[];
  inputRows: number;
  skippedBlanks: number;
  delimiter: string;
};
export function displayValue(v: Value): string {
  switch (v.kind) {
    case "blank":
      return "";
    case "text":
      return v.text;
    case "number":
      return v.decimal;
    case "date":
      return `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")}`;
  }
}
