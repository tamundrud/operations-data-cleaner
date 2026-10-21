import type { Correction, PendingCorrection } from "./correction-overlay";
import type { Workflow } from "../engine/workflow";
import type { SourceColumn, SourceRow } from "../engine/values";
import type { Run, ResultRow } from "../engine/recipes";
import type { Issue } from "../engine/issues";
import type { SafetyChoice } from "../formats/spreadsheet-safety";
export type SourceQuery = {page:number; filter:SourceFilter; target?:string; nextAfter?:string; column?:string};
export type Request = { request: number; dataset: string; revision: number } & (
  | {
      kind: "import";
      corrections?: Correction[];
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
  | { kind: "correct-batch"; edits: PendingCorrection[] }
  | ({ kind: "source-page" } & SourceQuery)
  | { kind: "run"; workflow: Workflow }
  | { kind: "page"; page: number; exceptions: boolean; invalidOnly?: boolean }
  | { kind: "export"; choice: SafetyChoice; partialAcknowledged?: boolean }
);
export type SourceFilter = "all" | "exceptions" | "invalid";
export type View = {
  columns: SourceColumn[];
  sourceRows: SourceRow[];
  sourceResults: ResultRow[];
  sourcePage: number;
  sourceTotalPages: number;
  sourceFilter: SourceFilter;
  sourceCount: number;
  sourceTarget?: string;
  sourceColumn?: string;
  sourceNavigation: number;
  rows: ResultRow[];
  workflowIssues: Issue[];
  summary: Run["summary"];
  riskyHeaders: string[];
  csvRisk: boolean;
  page: number;
  totalPages: number;
  exceptions: boolean;
  invalidOnly?: boolean;
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
  | { kind: "download"; bytes: Uint8Array; format: Workflow["output"]["format"] }
  | { kind: "error"; message: string }
);
