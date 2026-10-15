import type { Workflow } from "../engine/workflow";
import type { SafetyChoice } from "../formats/spreadsheet-safety";
import { MAX_FILE_BYTES } from "../formats/csv";
import type { Request, Response, View } from "./worker-protocol";
export type SessionState = {
  busy: string;
  view?: View;
  error: string;
  recoverable: boolean;
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
  };
  private candidate?: NonNullable<Session["active"]> & { workflow?: Workflow };
  private workflow?: Workflow;
  private revision = 0;
  state: SessionState = { busy: "", error: "", recoverable: false };
  onState: (state: SessionState) => void = () => {};
  onTemplate: (headers: string[]) => void = () => {};
  onWorkflow: (workflow: Workflow) => void = () => {};
  onSourcePolicy: (delimiter: "auto" | "," | ";" | "\t") => void = () => {};
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
        "Processing worker stopped. Retry the active file or upload another CSV.",
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
      if (m.kind === "error") {
        this.candidate = undefined;
        this.update({ busy: "", error: m.message });
        return;
      }
      if (m.kind === "view") {
        if (this.candidate) {
          const { workflow: replacementWorkflow, ...active } = this.candidate;
          this.active = active;
          this.onSourcePolicy(active.delimiter);
          this.candidate = undefined;
          if (replacementWorkflow) {
            this.workflow = replacementWorkflow;
            this.onWorkflow(replacementWorkflow);
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
          "Processing exceeded 30 seconds. Split the CSV into smaller tables and retry.",
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
    options: { template?: boolean; workflow?: Workflow } = {},
  ) {
    if (this.state.busy) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      this.update({
        error:
          "This build accepts .csv files only. Save the table as UTF-8 CSV and upload again.",
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.update({
        error: "CSV exceeds 25 MiB. Split it into smaller files and reupload.",
      });
      return;
    }
    const request = ++this.sequence;
    this.update({ busy: "Reading CSV…", error: "" });
    try {
      const bytes = await file.arrayBuffer();
      if (request !== this.sequence) return;
      const dataset = options.template
        ? (this.active?.dataset ?? "template")
        : crypto.randomUUID();
      const envelope = { request, dataset, revision: this.revision };
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
          "Importing and checking CSV…",
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
  activate(workflow: Workflow) {
    this.end();
    this.workflow = workflow;
    this.onWorkflow(workflow);
  }
  configure(workflow: Workflow) {
    if (this.state.busy || !this.active) return;
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
    if (!this.active || this.state.busy || this.state.recoverable) return;
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
    if (!this.active || this.state.busy || this.state.recoverable) return;
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
    clearTimeout(this.timer);
    this.update({
      busy: "",
      view: undefined,
      error: message,
      recoverable: Boolean(this.active),
    });
  }
  cancel() {
    this.stop(
      "Processing cancelled. Retry the active file or upload another CSV.",
    );
  }
  async retry() {
    if (this.active) await this.upload(this.active.file, this.active.delimiter);
  }
  end() {
    this.stop("");
    this.active = undefined;
    this.workflow = undefined;
    this.update({ recoverable: false, error: "" });
  }
}
