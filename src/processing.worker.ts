/// <reference lib="webworker" />
import "./schema-runtime";
declare const self: DedicatedWorkerGlobalScope;
import { parseCsv, serializeCsv } from "./formats/csv";
import { evaluate, type Run, type ResultRow } from "./engine/recipes";
import { makeWorkflow, type Workflow } from "./engine/workflow";
import type { SourceTable } from "./engine/values";
import type { Request, Response, View } from "./session/worker-protocol";
let source: SourceTable | undefined,
  workflow: Workflow | undefined,
  run: Run | undefined,
  revision = -1;
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
    sourceRows: source.rows.slice(0, PAGE_SIZE),
    rows: selected.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    workflowIssues: run.workflowIssues,
    summary: run.summary,
    riskyHeaders: run.riskyHeaders,
    page,
    totalPages,
    exceptions,
    delimiter: source.delimiter,
  };
}
self.onmessage = (event: MessageEvent<Request>) => {
  const m = event.data;
  const envelope = {
    request: m.request,
    dataset: m.dataset,
    revision: m.revision,
  };
  const send = (payload: Response) => self.postMessage(payload);
  try {
    if (m.kind === "template") {
      const template = parseCsv(
        new Uint8Array(m.bytes),
        m.delimiter,
        "template",
        true,
      );
      send({
        ...envelope,
        kind: "template",
        headers: template.columns.map((c) => c.header),
      });
      return;
    }
    if (m.kind === "import") {
      const candidate = parseCsv(
        new Uint8Array(m.bytes),
        m.delimiter,
        m.dataset,
      );
      const candidateWorkflow = m.workflow ?? makeWorkflow([]);
      const candidateRun = evaluate(candidateWorkflow, candidate);
      source = candidate;
      workflow = candidateWorkflow;
      setRun(candidateRun);
      revision = m.revision;
    } else {
      if (!source || m.dataset !== source.dataset || m.revision < revision)
        throw new Error(
          "This result is out of date. Run the current mapping again.",
        );
      if (m.kind === "run") {
        workflow = m.workflow;
        setRun(evaluate(workflow, source));
        revision = m.revision;
      } else if (m.revision !== revision)
        throw new Error(
          "Preview and export must use the current revision. Run the mapping again.",
        );
      if (m.kind === "export") {
        if (!workflow || !run)
          throw new Error("Preview the current mapping before download.");
        const bytes = serializeCsv(workflow, run, m.choice);
        self.postMessage(
          { ...envelope, kind: "download", bytes } satisfies Response,
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
