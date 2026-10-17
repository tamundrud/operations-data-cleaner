import { formatDate, type CalendarDate, type DatePattern } from "./dates";
export type Value =
  | { kind: "blank" }
  | { kind: "text"; text: string }
  | { kind: "number"; decimal: string }
  | ({ kind: "date"; format: DatePattern } & CalendarDate);
export type SourceColumn = { position: number; header: string; key: string };
export type SourceCell = {
  kind: "text"; raw: string; display: string;
  excel?: {
    type: string; value?: string | number | boolean; format?: string; formula?: string;
    date1904: boolean; date?: CalendarDate; dateInvalid?: boolean; unsupportedFormat?: boolean;
  };
};
export type SourceRow = {
  worksheet?: string;
  id: string;
  record: number;
  line: number;
  cells: SourceCell[];
};
export type SourceTable = {
  worksheet?: string;
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
      return formatDate(v, v.format);
  }
}
