/// <reference lib="webworker" />
import "./schema-runtime";
declare const self: DedicatedWorkerGlobalScope;
import { parseXlsx } from "./formats/xlsx";
import { serializeXlsx } from "./formats/xlsx-export";
import { parseCsv, serializeCsv } from "./formats/csv";
import { type Run, type ResultRow } from "./engine/recipes";
import { makeWorkflow, type Workflow } from "./engine/workflow";
import type { SourceTable, SourceRow } from "./engine/values";
import type { Request, Response, View } from "./session/worker-protocol";
import { correctedRun, correctedRows, type Correction } from "./session/correction-overlay";
let corrections: Correction[] = [];
let source: SourceTable | undefined,
  workflow: Workflow | undefined,
  run: Run | undefined,
  revision = -1;
let sourceRowsById = new Map<string, SourceRow>();
const PAGE_SIZE = 50;
let exceptionRows: ResultRow[] = [];
function setRun(next: Run) {
  run = next;
  exceptionRows = next.rows.filter((r) => r.issues.length);
}
function view(page = 0, exceptions = false): View {
  if (!source || !run)
    throw new Error("Upload a CSV and configure output fields.");
  const selected = exceptions ? exceptionRows : run.rows;
  const totalPages = Math.max(1, Math.ceil(selected.length / PAGE_SIZE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  return {
    columns: source.columns,
    sourceRows: correctedRows(source, corrections, run.workflowIssues.length
      ? source.rows.slice(0, PAGE_SIZE)
      : selected.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(r => sourceRowsById.get(r.id)!)),
    rows: selected.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    workflowIssues: run.workflowIssues,
    summary: run.summary,
    riskyHeaders: run.riskyHeaders,
    csvRisk: run.csvRisk,
    page,
    totalPages,
    exceptions,
    delimiter: source.delimiter,
    worksheet: source.worksheet,
  };
}
self.onmessage = async (event: MessageEvent<Request>) => {
  const m = event.data;
  const envelope = {
    request: m.request,
    dataset: m.dataset,
    revision: m.revision,
  };
  const send = (payload: Response) => self.postMessage(payload);
  try {
    let candidate: SourceTable | undefined;
    if (m.kind === "template" || m.kind === "import") {
      if (m.format === "xlsx") {
        const result = await parseXlsx(new Uint8Array(m.bytes), m.dataset, m.worksheet, m.kind === "template");
        if (!result.table) {
          send({ ...envelope, kind: "worksheets", sheets: result.sheets });
          return;
        }
        candidate = result.table;
      } else candidate = parseCsv(new Uint8Array(m.bytes), m.delimiter, m.dataset, m.kind === "template");
      if (m.kind === "template") {
        send({ ...envelope, kind: "template", headers: candidate.columns.map((c) => c.header) });
        return;
      }
    }
    if (m.kind === "import") {
      if (!candidate) throw new Error("No source table was imported.");
      const original = m.workflow ?? makeWorkflow([]);
      const candidateWorkflow = { ...original, source: { ...original.source, format: m.format ?? "csv", worksheet: candidate.worksheet, delimiter: m.delimiter } };
      const candidateRun = correctedRun(candidateWorkflow, candidate, m.corrections ?? []);
      corrections = m.corrections ?? [];
      source = candidate;
      sourceRowsById = new Map(source.rows.map(r => [r.id, r]));
      workflow = candidateWorkflow;
      setRun(candidateRun);
      revision = m.revision;
    } else {
      if (!source || m.dataset !== source.dataset || m.revision < revision)
        throw new Error(
          "This result is out of date. Run the current mapping again.",
        );
      if (m.kind === "correct") {
        if (!workflow || !source.rows.some(r => r.id === m.correction.row) || !source.columns.some(c => c.key === m.correction.column)) throw new Error("Select a current source cell.");
        corrections = corrections.filter(e => e.row !== m.correction.row || e.column !== m.correction.column);
        if (!m.revert) corrections.push(m.correction);
        setRun(correctedRun(workflow, source, corrections, run, m.correction.row));
        revision = m.revision;
      } else if (m.kind === "run") {
        workflow = m.workflow;
        setRun(correctedRun(workflow, source, corrections));
        revision = m.revision;
      } else if (m.revision !== revision)
        throw new Error(
          "Preview and export must use the current revision. Run the mapping again.",
        );
      if (m.kind === "export") {
        if (!workflow || !run)
          throw new Error("Preview the current mapping before download.");
        const format = workflow.output.format;
        const bytes = format === "xlsx" ? serializeXlsx(workflow, run) : serializeCsv(workflow, run, m.choice);
        self.postMessage(
          { ...envelope, kind: "download", bytes, format } satisfies Response,
          [bytes.buffer as ArrayBuffer],
        );
        return;
      }
    }
    send({
      ...envelope,
      kind: "view",
      view: view(
        m.kind === "page" ? m.page : 0,
        m.kind === "page" ? m.exceptions : false,
      ),
    });
  } catch (error) {
    send({
      ...envelope,
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "Processing failed. Check the CSV and try again.",
    });
  }
};
