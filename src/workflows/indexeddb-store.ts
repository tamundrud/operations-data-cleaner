import { normalizeHeader, type Workflow } from "../engine/workflow";
import { decodeUsableWorkflow, encodeWorkflow, snapshotWorkflow } from "./codec";

export interface StoredWorkflow { id: string; json: string; workflow: Workflow }
export interface WorkflowListing {
  records: StoredWorkflow[];
  issues: { key: IDBValidKey; message: string }[];
}
interface OperationOptions { signal?: AbortSignal }
interface SaveOptions extends OperationOptions { expected?: { id: string; json: string } }

export class WorkflowConflictError extends Error {
  constructor(public readonly reason: "collision" | "stale", public readonly records: StoredWorkflow[]) {
    super(reason === "stale"
      ? "The saved workflow changed. Refresh and review it before replacing."
      : "A workflow with this identity or name exists. Choose Replace, a uniquely named copy, or Cancel.");
    this.name = "WorkflowConflictError";
  }
}

function readRecords(values: unknown[], keys: IDBValidKey[]): WorkflowListing {
  const listing: WorkflowListing = { records: [], issues: [] };
  values.forEach((value, index) => {
    const key = keys[index];
    try {
      if (!value || typeof value !== "object" || Object.keys(value).length !== 2 ||
        !("id" in value) || !("json" in value) || typeof value.id !== "string" || typeof value.json !== "string" || value.id !== key)
        throw new Error("Invalid envelope");
      const workflow = decodeUsableWorkflow(value.json);
      if (workflow.id !== key || !workflow.name?.trim()) throw new Error("Invalid stored identity or name");
      listing.records.push({ id: value.id, json: value.json, workflow });
    } catch {
      listing.issues.push({ key, message: "This saved entry is unreadable or unsupported. It has been left untouched; use an intact workflow or import a backup." });
    }
  });
  return listing;
}

/** Explicit configuration snapshots only; each operation owns and closes its connection. */
export class WorkflowStore {
  constructor(private readonly factory: IDBFactory | undefined = globalThis.indexedDB) {}

  private open(signal?: AbortSignal): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      let finished = false;
      const fail = (error: Error) => {
        if (finished) return;
        finished = true;
        signal?.removeEventListener("abort", cancelled);
        reject(error);
      };
      const cancelled = () => fail(new Error("Workflow storage operation cancelled."));
      if (signal?.aborted) { cancelled(); return; }
      signal?.addEventListener("abort", cancelled, { once: true });
      try {
        if (!this.factory) throw new Error("Unavailable");
        const request = this.factory.open("operations-data-cleaner-workflows", 1);
        request.onupgradeneeded = () => {
          if (finished) { request.transaction?.abort(); return; }
          request.result.createObjectStore("workflows", { keyPath: "id" });
        };
        request.onblocked = () => fail(new Error("Workflow storage is blocked. Close other tabs using this app, then Retry."));
        request.onerror = () => fail(new Error("Workflow storage is unavailable. Retry or download a portable workflow backup."));
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => db.close();
          if (finished) { db.close(); return; }
          finished = true;
          signal?.removeEventListener("abort", cancelled);
          resolve(db);
        };
      } catch {
        fail(new Error("Workflow storage is unavailable. Retry or download a portable workflow backup."));
      }
    });
  }

  private async transact<T>(mode: IDBTransactionMode, options: OperationOptions,
    ready: (store: IDBObjectStore, listing: WorkflowListing, keys: IDBValidKey[]) => T): Promise<T> {
    const db = await this.open(options.signal);
    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      let result: T;
      let failure: unknown;
      let closed = false;
      const close = () => { if (!closed) { closed = true; db.close(); } };
      // An upgrade in another tab invalidates this short-lived connection.
      db.onversionchange = close;
      const cleanup = () => { options.signal?.removeEventListener("abort", cancel); close(); };
      const cancel = () => {
        failure = new Error("Workflow storage operation cancelled.");
        tx.abort();
      };
      try {
        tx = db.transaction("workflows", mode);
        tx.oncomplete = () => { cleanup(); resolve(result); };
        tx.onabort = () => {
          cleanup();
          reject(failure ?? new Error("Workflow storage write/read aborted. Retry or download a portable workflow backup."));
        };
        // Request errors abort the transaction by default; acknowledge only oncomplete.
        tx.onerror = () => { failure ??= new Error("Workflow storage failed. Retry or download a portable workflow backup."); };
        if (options.signal?.aborted) { cancel(); return; }
        options.signal?.addEventListener("abort", cancel, { once: true });
        const store = tx.objectStore("workflows");
        const values = store.getAll();
        const keys = store.getAllKeys();
        let loaded = 0;
        const read = () => {
          if (++loaded !== 2) return;
          try { result = ready(store, readRecords(values.result, keys.result), keys.result); }
          catch (error) { failure = error; tx.abort(); }
        };
        values.onsuccess = read;
        keys.onsuccess = read;
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error("Workflow storage is unavailable. Retry or download a portable workflow backup."));
      }
    });
  }

  list(options: OperationOptions = {}): Promise<WorkflowListing> {
    return this.transact("readonly", options, (_store, listing) => listing);
  }

  save(workflow: Workflow, options: SaveOptions = {}): Promise<StoredWorkflow> {
    // Capture before any asynchronous work: later editor changes cannot change this write.
    const snapshot = snapshotWorkflow(workflow);
    snapshot.name = snapshot.name?.trim();
    if (!snapshot.name) return Promise.reject(new Error("Enter a nonblank workflow name before saving."));
    if (options.expected && options.expected.id !== snapshot.id)
      return Promise.reject(new Error("Replacement must retain the explicitly selected workflow identity."));
    const record: StoredWorkflow = { id: snapshot.id, json: encodeWorkflow(snapshot), workflow: snapshot };
    const expected = options.expected ? { ...options.expected } : undefined;
    return this.transact("readwrite", options, (store, listing, keys) => {
      const target = listing.records.find((entry) => entry.id === record.id);
      if (expected && (!target || target.json !== expected.json))
        throw new WorkflowConflictError("stale", target ? [target] : []);
      const collisions = listing.records.filter((entry) =>
        (entry.id === record.id && !expected) ||
        (entry.id !== record.id && normalizeHeader(entry.workflow.name!) === normalizeHeader(snapshot.name!)));
      if (collisions.length || (!expected && keys.some((key) => key === record.id)))
        throw new WorkflowConflictError("collision", collisions);
      store.put({ id: record.id, json: record.json });
      return record;
    });
  }
}
