import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { correctedRun, type Correction } from "../../src/session/correction-overlay";
import { Session } from "../../src/session/controller";
import type {
  Request,
  Response,
  View,
} from "../../src/session/worker-protocol";
import { makeWorkflow, type Workflow } from "../../src/engine/workflow";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
import { serializeXlsx } from "../../src/formats/xlsx-export";
import { strFromU8, unzipSync } from "fflate";
import { type Run } from "../../src/engine/recipes";
import type { SourceTable } from "../../src/engine/values";
// Controllable transport and clock; parsed rows, evaluation and download bytes remain real.
class Transport {
  static instances: Transport[] = [];
  requests: Request[] = [];
  terminated = false;
  onmessage?: (event: MessageEvent<Response>) => void;
  onerror?: (event: { preventDefault: () => void }) => void;
  onmessageerror?: () => void;
  corrections: Correction[] = [];
  source?: SourceTable;
  workflow?: Workflow;
  run?: Run;
  constructor() {
    Transport.instances.push(this);
  }
  postMessage(message: Request) {
    this.requests.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  flush() {
    const m = this.requests.at(-1)!;
    const envelope = {
      request: m.request,
      dataset: m.dataset,
      revision: m.revision,
    };
    if (m.kind === "import") {
      this.source = parseCsv(new Uint8Array(m.bytes), m.delimiter, m.dataset);
      this.workflow = m.workflow ?? makeWorkflow([]);
      this.corrections = m.corrections ?? [];
      this.run = correctedRun(this.workflow, this.source, this.corrections);
    }
    if (m.kind === "run") {
      this.workflow = m.workflow;
      this.run = correctedRun(m.workflow, this.source!, this.corrections);
    }
    if (m.kind === "correct") {
      this.corrections = this.corrections.filter(e => e.row !== m.correction.row || e.column !== m.correction.column);
      if (!m.revert) this.corrections.push(m.correction);
      this.run = correctedRun(this.workflow!, this.source!, this.corrections, this.run, m.correction.row);
    }
    if (m.kind === "export") {
      this.onmessage?.({
        data: {
          ...envelope,
          kind: "download",
          format: this.workflow!.output.format,
          bytes: this.workflow!.output.format === "xlsx" ? serializeXlsx(this.workflow!, this.run!) : serializeCsv(this.workflow!, this.run!, m.choice),
        },
      } as MessageEvent<Response>);
      return;
    }
    const view: View = {
      columns: this.source!.columns,
      sourceRows: this.source!.rows,
      rows: this.run!.rows,
      workflowIssues: this.run!.workflowIssues,
      summary: this.run!.summary,
      riskyHeaders: this.run!.riskyHeaders,
      csvRisk: this.run!.csvRisk,
      page: 0,
      totalPages: 1,
      exceptions: false,
      delimiter: ",",
    };
    this.onmessage?.({
      data: { ...envelope, kind: "view", view },
    } as MessageEvent<Response>);
  }
}
const latest = () => Transport.instances.at(-1)!;
const file = () => new File(["ID\n001234"], "synthetic.csv");
const workflow = () => {
  const w = makeWorkflow(["Reference"]);
  w.fields[0].recipe = { kind: "copy", source: "id" };
  return w;
};
beforeEach(() => {
  Transport.instances = [];
  vi.stubGlobal("Worker", Transport);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test("Excel download carries worker format; cancellation rejects old bytes and retry preserves XLSX settings", async () => {
  const s = new Session(), w = workflow(); w.output.format = "xlsx";
  s.activate(w); await s.upload(file(), ","); latest().flush();
  const downloads: { bytes: Uint8Array; format: string }[] = [];
  s.onDownload = (bytes, format) => downloads.push({ bytes, format });
  s.export(undefined);
  const old = latest(), pending = old.requests.at(-1)!;
  s.cancel();
  old.onmessage?.({ data: { request: pending.request, dataset: pending.dataset, revision: pending.revision, kind: "download", format: "xlsx", bytes: new Uint8Array([1]) } } as MessageEvent<Response>);
  expect(downloads).toEqual([]);
  await s.retry(); latest().flush(); s.export(undefined); latest().flush();
  expect(downloads).toHaveLength(1); expect(downloads[0].format).toBe("xlsx");
  const parts = unzipSync(downloads[0].bytes);
  expect(strFromU8(parts["xl/sharedStrings.xml"])).toContain("001234");
  s.end();
});
test.each(["error", "messageerror", "watchdog"])(
  "CE #3: %s recovery reparses active File and exports identical real bytes",
  async (failure) => {
    const session = new Session();
    await session.upload(file(), ",");
    latest().flush();
    session.configure(workflow());
    latest().flush();
    const expected = session.state.view;
    const old = latest();
    if (failure === "error") old.onerror?.({ preventDefault: () => {} });
    else if (failure === "messageerror") old.onmessageerror?.();
    else {
      session.page(0, false);
      vi.advanceTimersByTime(30001);
    }
    expect(old.terminated).toBe(true);
    expect(session.state).toMatchObject({
      view: undefined,
      recoverable: true,
      busy: "",
    });
    session.export(undefined);
    expect(old.requests.at(-1)?.kind).not.toBe("export");
    await session.retry();
    latest().flush();
    expect(session.state.view?.rows.map((r) => r.values)).toEqual(
      expected?.rows.map((r) => r.values),
    );
    expect(session.state.recoverable).toBe(false);
    let bytes: Uint8Array | undefined;
    session.onDownload = (b) => {
      bytes = b;
    };
    session.export(undefined);
    latest().flush();
    expect(new TextDecoder().decode(bytes)).toBe("Reference\r\n001234\r\n");
    session.end();
  },
);
test("CE #2: rejection from a cancelled read cannot clear a newer busy operation", async () => {
  const session = new Session();
  let rejectOld: (reason: Error) => void = () => {};
  let resolveNew: (bytes: ArrayBuffer) => void = () => {};
  const old = file();
  vi.spyOn(old, "arrayBuffer").mockImplementation(
    () =>
      new Promise((_, reject) => {
        rejectOld = reject;
      }),
  );
  const current = file();
  vi.spyOn(current, "arrayBuffer").mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveNew = resolve;
      }),
  );
  const oldUpload = session.upload(old, ",");
  session.cancel();
  const newUpload = session.upload(current, ",");
  rejectOld(new Error("late rejection"));
  await oldUpload;
  expect(session.state.busy).toBe("Reading CSV…");
  expect(session.state.error).toBe("");
  resolveNew(new TextEncoder().encode("ID\n001234").buffer);
  await newUpload;
  latest().flush();
  expect(session.state.view?.summary.candidates).toBe(1);
  session.end();
});

test("activation releases the old run and installs configuration before a fresh upload", async () => {
  const session = new Session();
  await session.upload(file(), ","); latest().flush();
  const old = latest();
  session.activate(workflow());
  expect(old.terminated).toBe(true);
  expect(session.state).toMatchObject({ view: undefined, recoverable: false, busy: "" });
  await session.retry();
  expect(Transport.instances).toHaveLength(1);
  await session.upload(file(), "auto"); latest().flush();
  expect(session.state.view?.rows[0].values).toEqual([{ kind: "text", text: "001234" }]);
  session.end();
});

test("Excel worksheet discovery keeps the committed run until a selected sheet succeeds", async () => {
  const s = new Session();
  s.configure(workflow());
  await s.upload(file(), ','); latest().flush();
  const committed = s.state.view;
  await s.upload(new File(['synthetic'], 'orders.xlsx'), ',');
  const request = latest().requests.at(-1)!;
  expect(request).toMatchObject({ kind: 'import', format: 'xlsx' });
  latest().onmessage?.({ data: { request: request.request, dataset: request.dataset, revision: request.revision, kind: 'worksheets', sheets: ['Orders', 'Other'] } } as MessageEvent<Response>);
  expect(s.state.view).toBe(committed);
  expect(s.state.worksheets).toEqual(['Orders', 'Other']);
  s.cancelWorksheetSelection();
  expect(s.state.view).toBe(committed);
  expect(s.state.worksheets).toBeUndefined();
});

test("corrections survive cancelled replacements and reject stale worker replies during recovery", async () => {
  const s = new Session(); s.activate(workflow()); await s.upload(file(), ","); latest().flush();
  const row = s.state.view!.rows[0].id;
  s.correct(row, "id", "009876"); latest().flush();
  expect(s.state.view!.summary.corrected).toBe(1);
  await s.upload(new File(["ID\nNEW"], "new.csv"), ",");
  expect(s.state.replacement).toBe(true);
  s.cancelReplacement();
  expect(s.state.view!.rows[0].values).toEqual([{kind:"text",text:"009876"}]);
  await s.upload(new File(["ID\nNEW"], "new.csv"), ",");
  await s.confirmReplacement();
  const old = latest(), pending = old.requests.at(-1)!;
  s.cancel(); await s.retry();
  expect(s.state.busy).not.toBe("");
  s.export(undefined);
  expect(latest().requests.at(-1)!.kind).toBe("import");
  old.onmessage?.({ data: {...pending,kind:"view",view:{...s.state.view,summary:{corrected:0}}} } as unknown as MessageEvent<Response>);
  expect(s.state.view).toBeUndefined();
  latest().flush();
  expect(s.state.view!.rows[0].id).toBe(row);
  expect(s.state.view!.summary.corrected).toBe(1);
  let result = ""; s.onDownload = bytes => {result = new TextDecoder().decode(bytes);};
  s.export(undefined); latest().flush();
  expect(result).toBe("Reference\r\n009876\r\n");
  s.end();
});

test("cancelled delayed replacement cannot grant approval to a later upload", async () => {
  const s = new Session(); s.activate(workflow()); await s.upload(file(), ","); latest().flush();
  s.correct(s.state.view!.rows[0].id,"id","009876"); latest().flush();
  const delayed = new File(["ID\nNEW"],"delayed.csv");
  let release: (value: ArrayBuffer) => void = () => {};
  vi.spyOn(delayed,"arrayBuffer").mockImplementation(() => new Promise(resolve => {release=resolve;}));
  await s.upload(delayed,","); const reading = s.confirmReplacement();
  s.cancel();
  await s.upload(new File(["ID\nOTHER"],"other.csv"),",");
  expect(s.state.replacement).toBe(true);
  s.cancelReplacement();
  await s.retry(); latest().flush();
  expect(s.state.view!.rows[0].values).toEqual([{kind:"text",text:"009876"}]);
  release(new TextEncoder().encode("ID\nNEW").buffer); await reading;
  expect(s.state.view!.rows[0].values).toEqual([{kind:"text",text:"009876"}]);
  s.end();
});

test("same-worker older correction reply cannot complete a newer rule evaluation", async () => {
  const s = new Session(); s.activate(workflow()); await s.upload(file(), ","); latest().flush();
  s.correct(s.state.view!.rows[0].id,"id","009876");
  const transport = latest(), correction = transport.requests.at(-1)!;
  transport.flush();
  const prior = s.state.view!;
  const nextWorkflow = workflow(); nextWorkflow.fields[0].trim = true;
  s.configure(nextWorkflow);
  transport.onmessage?.({data:{request:correction.request,dataset:correction.dataset,revision:correction.revision,kind:"view",view:{...prior, summary:{...prior.summary,corrected:0}}}} as MessageEvent<Response>);
  expect(s.state.busy).toBe("Checking all rows…");
  expect(s.state.view!.summary.corrected).toBe(1);
  transport.flush();
  expect(s.state.busy).toBe("");
  expect(s.state.view!.rows[0].values).toEqual([{kind:"text",text:"009876"}]);
  s.end();
});
