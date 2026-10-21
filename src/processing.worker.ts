/// <reference lib="webworker" />
import "./schema-runtime";
declare const self: DedicatedWorkerGlobalScope;
import { parseXlsx } from "./formats/xlsx";
import { serializeXlsx } from "./formats/xlsx-export";
import { parseCsv, serializeCsv } from "./formats/csv";
import { type Run, type ResultRow } from "./engine/recipes";
import { makeWorkflow, type Workflow } from "./engine/workflow";
import type { SourceTable, SourceRow } from "./engine/values";
import type { Request, Response, View, SourceFilter } from "./session/worker-protocol";
import { correctedRun, correctedRows, applyCorrectionBatch, type Correction } from "./session/correction-overlay";
let corrections: Correction[] = [];
let source: SourceTable | undefined,
  workflow: Workflow | undefined,
  run: Run | undefined,
  revision = -1;
let sourceRowsById = new Map<string, SourceRow>();
const PAGE_SIZE = 50;
let exceptionRows: ResultRow[] = [];
let outputQuery = {page:0, exceptions:false, invalidOnly:false};
let sourceQuery: {page:number; filter:SourceFilter; target?:string; column?:string} = {page:0,filter:"all"};
let retained = new Set<string>();
let sourceNavigation = 0;
function setRun(next: Run) {
  run = next;
  exceptionRows = next.rows.filter((r) => r.issues.length);
}
function view(): View {
  let {page} = outputQuery;
  const {exceptions, invalidOnly} = outputQuery;
  if (!source || !run)
    throw new Error("Upload a CSV and configure output fields.");
  const selected = invalidOnly ? exceptionRows.filter(row => row.status === "invalid") : exceptions ? exceptionRows : run.rows;
  const totalPages = Math.max(1, Math.ceil(selected.length / PAGE_SIZE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  outputQuery.page = page;
  const sourceSelected = run.workflowIssues.length || sourceQuery.filter === "all" ? source.rows
    : run.rows.filter(r => retained.has(r.id) || (sourceQuery.filter === "invalid" ? r.status === "invalid" : r.issues.length)).map(r => sourceRowsById.get(r.id)!);
  const sourceTotalPages = Math.max(1, Math.ceil(sourceSelected.length / PAGE_SIZE));
  if (sourceQuery.target) {
    const index = sourceSelected.findIndex(r => r.id === sourceQuery.target);
    if (index >= 0) sourceQuery.page = Math.floor(index / PAGE_SIZE);
  }
  sourceQuery.page = Math.max(0, Math.min(sourceQuery.page, sourceTotalPages - 1));
  const sourceSlice = sourceSelected.slice(sourceQuery.page * PAGE_SIZE, (sourceQuery.page + 1) * PAGE_SIZE);
  const resultById = new Map(run.rows.map(r => [r.id,r]));
  return {
    columns: source.columns,
    sourceRows: correctedRows(source, corrections, sourceSlice),
    sourceResults: sourceSlice.flatMap(r => resultById.has(r.id) ? [resultById.get(r.id)!] : []),
    sourcePage: sourceQuery.page, sourceFilter: sourceQuery.filter, sourceCount: sourceSelected.length,
    sourceTotalPages, sourceTarget:sourceQuery.target, sourceColumn:sourceQuery.column, sourceNavigation,
    rows: selected.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    workflowIssues: run.workflowIssues,
    summary: run.summary,
    riskyHeaders: run.riskyHeaders,
    csvRisk: run.csvRisk,
    page,
    totalPages,
    exceptions,
    invalidOnly,
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
      outputQuery = {page:0,exceptions:false,invalidOnly:false};
      sourceQuery = {page:0,filter:"all"}; retained.clear();
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
      if (m.kind === "correct-batch") {
        if (!workflow) throw new Error("Configure a workflow before correcting source cells.");
        const next = applyCorrectionBatch(source, corrections, m.edits);
        const nextRun = correctedRun(workflow, source, next);
        corrections = next;
        retained = new Set(m.edits.map(e => e.row));
        setRun(nextRun);
        revision = m.revision;
      } else if (m.kind === "run") {
        workflow = m.workflow;
        setRun(correctedRun(workflow, source, corrections));
        revision = m.revision;
      } else if (m.revision !== revision)
        throw new Error(
          "Preview and export must use the current revision. Run the mapping again.",
        );
      if (m.kind === "page") outputQuery = {page:m.page,exceptions:m.exceptions,invalidOnly:m.invalidOnly ?? false};
      if (m.kind === "source-page") {
        sourceNavigation = m.request;
        retained.clear();
        let target = m.target;
        if (m.nextAfter !== undefined) {
          const after = sourceRowsById.get(m.nextAfter)?.record ?? -1;
          const unresolved = run!.rows.filter(r => r.issues.length);
          target = unresolved.find(r => r.record > after)?.id ?? unresolved[0]?.id;
        }
        sourceQuery = {page:m.page,filter:target ? "all" : m.filter,target,column:m.column};
      }
      if (m.kind === "export") {
        if (!workflow || !run)
          throw new Error("Preview the current mapping before download.");
        const format = workflow.output.format;
        const bytes = format === "xlsx" ? serializeXlsx(workflow, run, m.partialAcknowledged) : serializeCsv(workflow, run, m.choice, m.partialAcknowledged);
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
      view: view(),
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
