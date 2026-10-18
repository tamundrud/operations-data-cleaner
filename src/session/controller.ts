import type { Workflow } from "../engine/workflow";
import type { SafetyChoice } from "../formats/spreadsheet-safety";
import { MAX_FILE_BYTES } from "../formats/csv";
import type { Request, Response, View } from "./worker-protocol";
export type SessionState = {
  busy: string;
  view?: View;
  error: string;
  recoverable: boolean;
  worksheets?: string[];
};
export class Session {
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
  state: SessionState = { busy: "", error: "", recoverable: false };
  onState: (state: SessionState) => void = () => {};
  onTemplate: (headers: string[]) => void = () => {};
  onWorkflow: (workflow: Workflow) => void = () => {};
  onSourcePolicy: (delimiter: "auto" | "," | ";" | "\t", format?: "csv" | "xlsx", worksheet?: string) => void = () => {};
  onDownload: (bytes: Uint8Array) => void = () => {};
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
        this.update({ busy: "", error: m.message });
        return;
      }
      if (m.kind === "view") {
        if (this.candidate) {
          const { workflow: replacementWorkflow, ...active } = this.candidate;
          const format = active.file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv";
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
        this.onDownload(m.bytes);
      }
    };
  }
  private send(m: Request, busy: string) {
    this.startWorker();
    this.pending = m;
    this.update({ busy, error: "", recoverable: false });
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
  async upload(
    file: File,
    delimiter: "auto" | "," | ";" | "\t",
    options: { template?: boolean; workflow?: Workflow; worksheet?: string } = {},
  ) {
    if (this.state.busy) return;
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
      const dataset = options.template
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
  selectWorksheet(worksheet: string) {
    const selection = this.selection;
    if (!selection || !this.state.worksheets?.includes(worksheet)) return;
    void this.upload(selection.file, selection.delimiter, { ...selection.options, worksheet });
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
    if (this.state.busy || this.state.worksheets || !this.active) return;
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
  page(page: number, exceptions: boolean) {
    if (!this.active || this.state.busy || this.state.worksheets || this.state.recoverable) return;
    this.send(
      {
        kind: "page",
        request: ++this.sequence,
        dataset: this.active.dataset,
        revision: this.revision,
        page,
        exceptions,
      },
      "Loading preview…",
    );
  }
  export(choice: SafetyChoice) {
    if (!this.active || this.state.busy || this.state.worksheets || this.state.recoverable) return;
    this.send(
      {
        kind: "export",
        request: ++this.sequence,
        dataset: this.active.dataset,
        revision: this.revision,
        choice,
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
    this.selection = undefined;
    clearTimeout(this.timer);
    this.update({
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
    if (this.active) await this.upload(this.active.file, this.active.delimiter, { worksheet: this.active.worksheet });
  }
  end() {
    this.stop("");
    this.active = undefined;
    this.workflow = undefined;
    this.update({ recoverable: false, error: "" });
  }
}
