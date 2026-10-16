import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { decodeUsableWorkflow, encodeWorkflow } from "../../src/workflows/codec";
import { WorkflowConflictError, WorkflowStore } from "../../src/workflows/indexeddb-store";
const workflow = () => decodeUsableWorkflow(readFileSync("tests/fixtures/workflows/u4-supported.json", "utf8"));

// Controllable native request seam: request success and transaction completion
// are independent events, so acknowledgement/abort behavior is observable.
function harness(values: unknown[] = [], keys: IDBValidKey[] = []) {
  const open = {} as IDBOpenDBRequest;
  const reads: IDBRequest[] = [];
  const writes: unknown[] = [];
  let closed = 0;
  const tx = {
    objectStore: () => ({
      getAll: () => { const r = {} as IDBRequest; reads.push(r); return r; },
      getAllKeys: () => { const r = {} as IDBRequest; reads.push(r); return r; },
      put: (value: unknown) => { writes.push(value); return {} as IDBRequest; },
    }),
    abort: () => { tx.onabort?.({} as Event); },
    onabort: null as ((event: Event) => void) | null,
    oncomplete: null as ((event: Event) => void) | null,
    error: null as DOMException | null,
  };
  const db = { transaction: () => tx, close: () => { closed++; }, onversionchange: null as (() => void) | null };
  const factory = { open: () => open } as unknown as IDBFactory;
  return {
    store: new WorkflowStore(factory), open, tx, writes,
    get closed() { return closed; },
    async connected() {
      Object.assign(open, { result: db }); open.onsuccess?.({} as Event);
      await Promise.resolve();
    },
    loaded() {
      Object.assign(reads[0], { result: values }); reads[0].onsuccess?.({} as Event);
      Object.assign(reads[1], { result: keys }); reads[1].onsuccess?.({} as Event);
    },
    complete() { tx.oncomplete?.({} as Event); },
    versionchange() { db.onversionchange?.(); },
  };
}

test("save writes only the named configuration envelope and waits for transaction completion", async () => {
  const h = harness(); const w = workflow(); w.name = "  Synthetic name  ";
  let settled = false;
  const saving = h.store.save(w).then((r) => { settled = true; return r; });
  await h.connected(); h.loaded(); await Promise.resolve();
  expect(settled).toBe(false);
  expect(h.writes).toEqual([{ id: w.id, json: encodeWorkflow({ ...w, name: "Synthetic name" }) }]);
  h.complete(); const saved = await saving;
  expect(saved.workflow.name).toBe("Synthetic name"); expect(h.closed).toBe(1);
});

test("successful requests followed by abort never acknowledge a save", async () => {
  const h = harness(); const saving = h.store.save(workflow());
  const rejection = expect(saving).rejects.toThrow(/save|storage|abort/i);
  await h.connected(); h.loaded(); h.tx.error = new DOMException("quota", "QuotaExceededError");
  h.tx.abort(); await rejection; expect(h.closed).toBe(1);
});

test.each(["identity", "name", "distinct targets"])("rejects unapproved %s collisions without writing", async (kind) => {
  const w = workflow(); const first = { ...w, id: kind === "name" ? "other" : w.id, name: kind === "identity" ? "Other" : w.name };
  const records = [first, ...(kind === "distinct targets" ? [{ ...w, id: "second" }] : [])].map((v) => ({ id: v.id, json: encodeWorkflow(v) }));
  const h = harness(records, records.map((r) => r.id));
  const saving = h.store.save(w); const rejection = expect(saving).rejects.toBeInstanceOf(WorkflowConflictError);
  await h.connected(); h.loaded(); await rejection; expect(h.writes).toEqual([]);
});

test("replacement compares exact presented snapshot in the write transaction", async () => {
  const w = workflow(); const original = encodeWorkflow(w); const changed = encodeWorkflow({ ...w, name: "Changed elsewhere" });
  const h = harness([{ id: w.id, json: changed }], [w.id]);
  const saving = h.store.save(w, { expected: { id: w.id, json: original } });
  const rejection = expect(saving).rejects.toMatchObject({ reason: "stale" });
  await h.connected(); h.loaded(); await rejection; expect(h.writes).toEqual([]);
});

test("unchanged explicit target can replace, but another entry's name cannot", async () => {
  const w = workflow(); const json = encodeWorkflow(w);
  const h = harness([{ id: w.id, json }], [w.id]);
  const saving = h.store.save({ ...w, name: "Updated" }, { expected: { id: w.id, json } });
  await h.connected(); h.loaded(); h.complete(); expect((await saving).workflow.name).toBe("Updated");
  const other = { ...w, id: "another", name: "Taken" };
  const blocked = harness([{ id: w.id, json }, { id: other.id, json: encodeWorkflow(other) }], [w.id, other.id]);
  const conflict = blocked.store.save({ ...w, name: "  TAKEN  " }, { expected: { id: w.id, json } });
  const rejection = expect(conflict).rejects.toBeInstanceOf(WorkflowConflictError);
  await blocked.connected(); blocked.loaded(); await rejection; expect(blocked.writes).toEqual([]);
});

test("isolates malformed envelopes, corrupt JSON, future versions and key disagreement without deleting", async () => {
  const w = workflow(); const json = encodeWorkflow(w);
  const values = [{ id: w.id, json }, { id: "bad", json: "{" }, { id: "mismatch", json }, { id: "future", json: json.replace('"version": 1', '"version": 99') }, { id: "extra", json, rows: [] }];
  const h = harness(values, [w.id, "bad", "mismatch", "future", "extra"]);
  const listing = h.store.list(); await h.connected(); h.loaded(); h.complete();
  const result = await listing; expect(result.records).toEqual([{ id: w.id, json, workflow: w }]); expect(result.issues).toHaveLength(4); expect(h.writes).toEqual([]);
});

test("corrupt records still reserve their ID", async () => {
  const w = workflow(); const h = harness([{ id: w.id, json: "{" }], [w.id]);
  const saving = h.store.save(w); const rejection = expect(saving).rejects.toBeInstanceOf(WorkflowConflictError);
  await h.connected(); h.loaded(); await rejection; expect(h.writes).toEqual([]);
});

test("blocked or cancelled opens close a late connection", async () => {
  for (const blocked of [true, false]) {
    const h = harness(); const controller = new AbortController(); const listing = h.store.list({ signal: controller.signal });
    const rejection = expect(listing).rejects.toThrow(blocked ? /other tabs|retry/i : /cancel|abort/i);
    if (blocked) h.open.onblocked?.({} as IDBVersionChangeEvent); else controller.abort();
    await rejection; await h.connected(); expect(h.closed).toBe(1);
  }
});

test("storage denial rejects safely; version changes close an active connection", async () => {
  const denied = harness(); const listing = denied.store.list(); const rejected = expect(listing).rejects.toThrow(/storage|unavailable/i);
  Object.assign(denied.open, { error: new DOMException("denied", "SecurityError") }); denied.open.onerror?.({} as Event); await rejected;
  const h = harness(); const pending = h.store.list(); await h.connected(); h.versionchange(); expect(h.closed).toBe(1); h.loaded(); h.complete(); await pending;
});

test("a submitted snapshot stays fixed while the draft changes", async () => {
  const w = workflow(); const h = harness(); const pending = h.store.save(w);
  w.name = "New unsaved edit"; w.fields[0].header = "Changed later";
  await h.connected(); h.loaded(); h.complete();
  const saved = await pending;
  expect(saved.workflow.name).toBe("Synthetic reusable configuration");
  expect(saved.workflow.fields[0].header).toBe("Reference");
});

test("a uniquely named new identity is a copy and blank names never open storage", async () => {
  const original = workflow(); const h = harness([{ id: original.id, json: encodeWorkflow(original) }], [original.id]);
  const pending = h.store.save({ ...original, id: "new-copy", name: "Copy" });
  await h.connected(); h.loaded(); h.complete(); expect((await pending).id).toBe("new-copy");
  const untouched = harness(); await expect(untouched.store.save({ ...original, name: " \t " })).rejects.toThrow(/name/i);
  expect(untouched.open.onsuccess).toBeUndefined();
});

test("cancellation during a transaction aborts rather than acknowledging a pending save", async () => {
  const h = harness(); const controller = new AbortController();
  const pending = h.store.save(workflow(), { signal: controller.signal });
  const rejection = expect(pending).rejects.toThrow(/cancel/i);
  await h.connected(); h.loaded(); controller.abort(); await rejection;
  expect(h.closed).toBe(1);
});
