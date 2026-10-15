import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Session } from "../../src/session/controller";
import type {
  Request,
  Response,
  View,
} from "../../src/session/worker-protocol";
import { makeWorkflow, type Workflow } from "../../src/engine/workflow";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
import { evaluate, type Run } from "../../src/engine/recipes";
import type { SourceTable } from "../../src/engine/values";
// Controllable transport and clock; parsed rows, evaluation and download bytes remain real.
class Transport {
  static instances: Transport[] = [];
  requests: Request[] = [];
  terminated = false;
  onmessage?: (event: MessageEvent<Response>) => void;
  onerror?: (event: { preventDefault: () => void }) => void;
  onmessageerror?: () => void;
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
      this.run = evaluate(this.workflow, this.source);
    }
    if (m.kind === "run") {
      this.workflow = m.workflow;
      this.run = evaluate(m.workflow, this.source!);
    }
    if (m.kind === "export") {
      this.onmessage?.({
        data: {
          ...envelope,
          kind: "download",
          bytes: serializeCsv(this.workflow!, this.run!, m.choice),
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
