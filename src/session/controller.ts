import type { Workflow } from "../engine/workflow";
import type { SafetyChoice } from "../formats/spreadsheet-safety";
import { MAX_FILE_BYTES } from "../formats/csv";
import type { Request, Response, View, SourceQuery } from "./worker-protocol";
import { mergeCorrections, type Correction, type PendingCorrection } from "./correction-overlay";
export type SessionState = {
  partialAcknowledged: boolean;
  pendingCorrections: PendingCorrection[];
  correctionMessage: string;
  replacement?: boolean;
  busy: string;
  view?: View;
  error: string;
  recoverable: boolean;
  worksheets?: string[];
};
export class Session {
  private corrections: Correction[] = [];
  private applyingCorrections?: Correction[];
  private replacement?: { file: File; delimiter: "auto" | "," | ";" | "\t"; options: { workflow?: Workflow; worksheet?: string } };
  private worker?: Worker;
  private sequence = 0;
  private pending?: Request;
  private timer?: ReturnType<typeof setTimeout>;
  private active?: {
    file: File;
    delimiter: "auto" | "," | ";" | "\t";
    dataset: string;
    worksheet?: string;
  };
  private candidate?: NonNullable<Session["active"]> & { workflow?: Workflow };
  private selection?: { file: File; delimiter: "auto" | "," | ";" | "\t"; options: { template?: boolean; workflow?: Workflow; worksheet?: string } };
  private workflow?: Workflow;
  private revision = 0;
  state: SessionState = { pendingCorrections: [], correctionMessage: "", partialAcknowledged: false, busy: "", error: "", recoverable: false };
  onState: (state: SessionState) => void = () => {};
  onTemplate: (headers: string[]) => void = () => {};
  onWorkflow: (workflow: Workflow) => void = () => {};
  onSourcePolicy: (delimiter: "auto" | "," | ";" | "\t", format?: "csv" | "xlsx", worksheet?: string) => void = () => {};
  onDownload: (bytes: Uint8Array, format: Workflow["output"]["format"]) => void = () => {};
  private update(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.onState(this.state);
  }
  private startWorker() {
    if (this.worker) return;
    this.worker = new Worker(
      new URL("../processing.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.stop(
        "Processing worker stopped. Retry the active file or upload another CSV or Excel file.",
      );
    };
    this.worker.onmessageerror = () =>
      this.stop("Worker response could not be read. Retry the active file.");
    this.worker.onmessage = (event: MessageEvent<Response>) => {
      const m = event.data,
        pending = this.pending;
      if (
        !pending ||
        m.request !== pending.request ||
        m.dataset !== pending.dataset ||
        m.revision !== pending.revision
      )
        return;
      clearTimeout(this.timer);
      this.pending = undefined;
      if (m.kind === "worksheets") {
        this.candidate = undefined;
        this.update({ busy: "", worksheets: m.sheets });
        return;
      }
      this.selection = undefined;
      if (m.kind === "error") {
        this.candidate = undefined;
        this.applyingCorrections = undefined;
        if (pending.kind === "correct-batch") this.revision = pending.revision - 1;
        this.update({ busy: "", error: m.message });
        return;
      }
      if (m.kind === "view") {
        if (pending.kind === "correct-batch" && this.applyingCorrections) {
          this.corrections = this.applyingCorrections;
          this.applyingCorrections = undefined;
          this.update({pendingCorrections:[], correctionMessage:`Applied ${pending.edits.length} corrections. Results and counts updated.`});
        }
        if (this.candidate) {
          const { workflow: replacementWorkflow, ...active } = this.candidate;
          const format = active.file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv";
          if (active.dataset !== this.active?.dataset) {
            this.corrections = []; this.update({pendingCorrections:[], correctionMessage:""});
          }
          this.active = { ...active, worksheet: m.view.worksheet };
          this.onSourcePolicy(active.delimiter, format, m.view.worksheet);
          this.candidate = undefined;
          if (replacementWorkflow) {
            this.workflow = { ...replacementWorkflow, source: { ...replacementWorkflow.source, format, worksheet: m.view.worksheet, delimiter: active.delimiter } };
            this.onWorkflow(this.workflow);
          }
        }
        this.update({ busy: "", view: m.view, error: "", recoverable: false });
      } else if (m.kind === "template") {
        this.update({ busy: "", error: "" });
        this.onTemplate(m.headers);
      } else {
        this.update({ busy: "", error: "" });
        this.onDownload(m.bytes, m.format);
      }
    };
  }
  private send(m: Request, busy: string) {
    this.startWorker();
    this.pending = m;
    this.update({
      busy, error: "", recoverable: false,
      partialAcknowledged: m.kind === "page" || m.kind === "source-page" || m.kind === "export"
        ? this.state.partialAcknowledged : false,
    });
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () =>
        this.stop(
          "Processing exceeded 30 seconds. Split the table into smaller files and retry.",
        ),
      30000,
    );
    if (m.kind === "import" || m.kind === "template")
      this.worker!.postMessage(m, [m.bytes]);
    else this.worker!.postMessage(m);
  }
  private async importFile(
    file: File,
    delimiter: "auto" | "," | ";" | "\t",
    options: { template?: boolean; workflow?: Workflow; worksheet?: string } = {},
    recovery = false,
    approved = false,
  ) {
    if (this.state.busy || this.state.replacement) return;
    this.acknowledgePartial(false);
    if (!options.template && (this.corrections.length || this.state.pendingCorrections.length) && !recovery && !approved) {
      this.replacement = { file, delimiter, options };
      this.update({ replacement: true });
      return;
    }
    const format: "csv" | "xlsx" = file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv";
    if (!/\.(csv|xlsx)$/iu.test(file.name)) {
      this.update({
        error:
          "Choose a .csv or .xlsx file. Save older Excel formats as .xlsx or UTF-8 CSV.",
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.update({
        error: "File exceeds 25 MiB. Split it into smaller files and reupload.",
      });
      return;
    }
    const request = ++this.sequence;
    this.selection = { file, delimiter, options };
    this.update({ busy: format === "csv" ? "Reading CSV…" : "Reading Excel…", error: "", worksheets: undefined });
    try {
      const bytes = await file.arrayBuffer();
      if (request !== this.sequence) return;
      const dataset = recovery ? this.active!.dataset : options.template
        ? (this.active?.dataset ?? "template")
        : crypto.randomUUID();
      const worksheet = options.worksheet ?? (options.template ? undefined : (options.workflow ?? (!this.active ? this.workflow : undefined))?.source.worksheet);
      const envelope = { request, dataset, revision: this.revision, format, worksheet };
      if (options.template)
        this.send(
          { ...envelope, kind: "template", bytes, delimiter },
          "Reading template…",
        );
      else {
        this.candidate = {
          file,
          delimiter,
          dataset,
          worksheet,
          workflow: options.workflow,
        };
        this.send(
          {
            ...envelope,
            kind: "import",
            corrections: recovery ? this.corrections : [],
            bytes,
            delimiter,
            workflow: options.workflow ?? this.workflow,
          },
          format === "csv" ? "Importing and checking CSV…" : "Importing and checking file…",
        );
      }
    } catch {
      if (request !== this.sequence) return;
      this.update({
        busy: "",
        error:
          "The file could not be read. Select it again or try a local copy.",
      });
    }
  }
  async upload(file: File, delimiter: "auto" | "," | ";" | "\t", options: { template?: boolean; workflow?: Workflow; worksheet?: string } = {}) {
    await this.importFile(file, delimiter, options);
  }
  async confirmReplacement() {
    const replacement = this.replacement;
    this.replacement = undefined;
    this.update({ replacement: false });
    if (!replacement) return;
    await this.importFile(replacement.file, replacement.delimiter, replacement.options, false, true);
  }
  cancelReplacement() {
    this.replacement = undefined;
    this.update({ replacement: false });
  }
  stageCorrection(row: string, column: string, value: string, revert = false) {
    if (!this.active || this.state.busy || this.state.worksheets || this.state.replacement || this.state.recoverable) return;
    const current = this.state.view?.sourceRows.find(r => r.id === row);
    const position = this.state.view?.columns.find(c => c.key === column)?.position;
    if (!current || position === undefined) return;
    const cell = current.cells[position];
    const pending = this.state.pendingCorrections.filter(e => e.row !== row || e.column !== column);
    if (revert ? Boolean(cell?.original) : value !== (cell?.raw ?? "")) pending.push({row,column,value,...(revert ? {revert:true} : {})});
    this.update({pendingCorrections:pending, partialAcknowledged:false, correctionMessage:""});
  }
  discardPending() {
    if (this.state.busy) return;
    this.update({pendingCorrections:[], correctionMessage:"Pending changes discarded."});
  }
  applyCorrections() {
    if (!this.active || this.state.busy || this.state.worksheets || this.state.replacement || this.state.recoverable || !this.state.pendingCorrections.length) return;
    // The visible page is only a slice; the worker validates all batch coordinates.
    this.applyingCorrections = mergeCorrections(this.corrections, this.state.pendingCorrections);
    this.send({kind:"correct-batch", edits:this.state.pendingCorrections, request:++this.sequence, dataset:this.active.dataset, revision:++this.revision}, "Applying corrections and checking all rows…");
  }
  sourcePage(query: SourceQuery) {
    if (!this.active || this.state.busy || this.state.worksheets || this.state.replacement || this.state.recoverable) return;
    this.send({kind:"source-page",...query,request:++this.sequence,dataset:this.active.dataset,revision:this.revision}, "Loading source rows…");
  }
  selectWorksheet(worksheet: string) {
    const selection = this.selection;
    if (!selection || !this.state.worksheets?.includes(worksheet)) return;
    void this.importFile(selection.file, selection.delimiter, { ...selection.options, worksheet }, false, true);
  }
  cancelWorksheetSelection() {
    this.selection = undefined;
    this.update({ worksheets: undefined, error: "" });
  }
  activate(workflow: Workflow) {
    this.end();
    this.workflow = workflow;
    this.onWorkflow(workflow);
  }
  configure(workflow: Workflow) {
    if (this.state.busy || this.state.worksheets || this.state.replacement || !this.active) return;
    this.workflow = workflow;
    this.revision++;
    this.send(
      {
        kind: "run",
        request: ++this.sequence,
        dataset: this.active.dataset,
        revision: this.revision,
        workflow,
      },
      "Checking all rows…",
    );
  }
  page(page: number, exceptions: boolean, invalidOnly = false) {
    if (!this.active || this.state.busy || this.state.worksheets || this.state.replacement || this.state.recoverable) return;
    this.send(
      {
        kind: "page",
        request: ++this.sequence,
        dataset: this.active.dataset,
        revision: this.revision,
        page,
        exceptions,
        invalidOnly,
      },
      "Loading preview…",
    );
  }
  acknowledgePartial(acknowledged: boolean) {
    const view = this.state.view;
    this.update({ partialAcknowledged: Boolean(acknowledged && view && !this.state.busy &&
      !this.state.worksheets && !this.state.replacement && !this.state.recoverable &&
      !this.state.pendingCorrections.length && !view.workflowIssues.length && view.summary.invalid &&
      view.summary.valid + view.summary.warningOnly > 0) });
  }
  export(choice: SafetyChoice) {
    if (!this.active || this.state.busy || this.state.worksheets || this.state.replacement || this.state.recoverable) return;
    const view = this.state.view;
    if (this.state.pendingCorrections.length || !view || view.workflowIssues.length || !(view.summary.valid + view.summary.warningOnly) ||
      (view.summary.invalid && !this.state.partialAcknowledged)) return;
    this.send(
      {
        kind: "export",
        request: ++this.sequence,
        dataset: this.active.dataset,
        revision: this.revision,
        choice,
        partialAcknowledged: this.state.partialAcknowledged,
      },
      "Preparing download…",
    );
  }
  private stop(message: string) {
    this.sequence++;
    this.worker?.terminate();
    this.worker = undefined;
    this.pending = undefined;
    this.candidate = undefined;
    this.applyingCorrections = undefined;
    this.selection = undefined;
    clearTimeout(this.timer);
    this.update({
      partialAcknowledged: false,
      busy: "",
      worksheets: undefined,
      view: undefined,
      error: message,
      recoverable: Boolean(this.active),
    });
  }
  cancel() {
    this.stop(
      "Processing cancelled. Retry the active file or upload another CSV or Excel file.",
    );
  }
  async retry() {
    if (this.active) {
      await this.importFile(this.active.file, this.active.delimiter, { worksheet: this.active.worksheet }, true);
    }
  }
  end() {
    this.stop("");
    this.active = undefined;
    this.corrections = [];
    this.update({pendingCorrections:[], correctionMessage:""});
    this.cancelReplacement();
    this.workflow = undefined;
    this.update({ recoverable: false, error: "" });
  }
}
