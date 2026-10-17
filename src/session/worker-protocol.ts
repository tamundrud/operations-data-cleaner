import type { Workflow } from "../engine/workflow";
import type { SourceColumn, SourceRow } from "../engine/values";
import type { Run, ResultRow } from "../engine/recipes";
import type { Issue } from "../engine/issues";
import type { SafetyChoice } from "../formats/spreadsheet-safety";
export type Request = { request: number; dataset: string; revision: number } & (
  | {
      kind: "import";
      bytes: ArrayBuffer;
      format?: "csv" | "xlsx";
      worksheet?: string;
      delimiter: "auto" | "," | ";" | "\t";
      workflow?: Workflow;
    }
  | {
      kind: "template";
      bytes: ArrayBuffer;
      format?: "csv" | "xlsx";
      worksheet?: string;
      delimiter: "auto" | "," | ";" | "\t";
    }
  | { kind: "run"; workflow: Workflow }
  | { kind: "page"; page: number; exceptions: boolean }
  | { kind: "export"; choice: SafetyChoice }
);
export type View = {
  columns: SourceColumn[];
  sourceRows: SourceRow[];
  rows: ResultRow[];
  workflowIssues: Issue[];
  summary: Run["summary"];
  riskyHeaders: string[];
  csvRisk: boolean;
  page: number;
  totalPages: number;
  exceptions: boolean;
  delimiter: string;
  worksheet?: string;
};
export type Response = {
  request: number;
  dataset: string;
  revision: number;
} & (
  | { kind: "view"; view: View }
  | { kind: "worksheets"; sheets: string[] }
  | { kind: "template"; headers: string[] }
  | { kind: "download"; bytes: Uint8Array }
  | { kind: "error"; message: string }
);
