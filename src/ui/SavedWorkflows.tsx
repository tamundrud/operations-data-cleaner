import { useEffect, useRef, useState } from "react";
import type { Workflow } from "../engine/workflow";
import { decodeUsableWorkflow, encodeWorkflow } from "../workflows/codec";
import { WorkflowStore, WorkflowConflictError, type StoredWorkflow, type WorkflowListing } from "../workflows/indexeddb-store";
interface Props {
  workflow: Workflow;
  baseline?: StoredWorkflow;
  disabled: boolean;
  writePending: boolean;
  openPending: boolean;
  opening: (value: boolean) => void;
  generation: number;
  unsaved: boolean;
  name: (value: string) => void;
  snapshot: (copy?: boolean) => Workflow;
  activate: (workflow: Workflow, record?: StoredWorkflow) => boolean;
  saved: (record: StoredWorkflow) => void;
  saving: (value: boolean) => void;
  reset: () => void;
}
export default function SavedWorkflows(props: Props) {
  const [store] = useState(() => new WorkflowStore());
  const [listing, setListing] = useState<WorkflowListing>({ records: [], issues: [] });
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("");
  const [backup, setBackup] = useState(false);
  const [conflict, setConflict] = useState<{ snapshot: Workflow; records: StoredWorkflow[] }>();
  const [target, setTarget] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const operation = useRef<AbortController | undefined>(undefined);
  const generation = useRef(props.generation);
  generation.current = props.generation;
  const selection = useRef(0);
  const currentProps = useRef(props);
  currentProps.current = props;
  const refresh = async () => {
    operation.current?.abort();
    const abort = new AbortController(); operation.current = abort;
    const revision = generation.current;
    try {
      const next = await store.list({ signal: abort.signal });
      if (abort.signal.aborted || revision !== generation.current) return;
      setListing(next); setStatus("");
    } catch (error) {
      if (!abort.signal.aborted && revision === generation.current) setStatus((error as Error).message);
    }
  };
  useEffect(() => {
    setBackup(false); setConflict(undefined); selection.current++;
    void refresh();
    return () => operation.current?.abort();
  }, [store, props.generation]);
  useEffect(() => {
    if (conflict) dialog.current?.showModal();
    else dialog.current?.close();
  }, [conflict]);
  const write = async (snapshot: Workflow, expected?: StoredWorkflow) => {
    const revision = generation.current;
    const abort = new AbortController(); operation.current?.abort(); operation.current = abort;
    props.saving(true); setStatus("Saving workflow…");
    try {
      const record = await store.save(snapshot, { expected, signal: abort.signal });
      if (revision !== generation.current || abort.signal.aborted) return;
      props.saved(record); setConflict(undefined);
      setListing((list) => ({ ...list, records: [...list.records.filter((r) => r.id !== record.id), record] }));
      setSelected(record.id); setStatus("Saved in this browser.");
      if (!expected) setBackup(true);
    } catch (error) {
      if (revision !== generation.current || abort.signal.aborted) return;
      setStatus((error as Error).message);
      if (error instanceof WorkflowConflictError && error.reason === "collision") {
        setConflict({ snapshot, records: error.records }); setTarget(error.records[0]?.id ?? "");
      }
    } finally {
      if (revision === generation.current) props.saving(false);
    }
  };
  const save = (copy = false) => {
    try { void write(props.snapshot(copy), copy ? undefined : props.baseline); }
    catch (error) { setStatus((error as Error).message); }
  };
  const download = () => {
    try {
      const json = encodeWorkflow(props.snapshot());
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "workflow.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setStatus((error as Error).message); }
  };
  return <section className="panel workflow-controls" aria-label="Workflow configuration">
    <h2>Save & repeat</h2>
    <p>Saved workflows belong to this browser and origin. Browser data can be cleared. Download a backup to recover or transfer your configuration.</p>
    <div className="workflow-actions">
      <label>Saved workflows<select aria-label="Saved workflows" value={selected} disabled={props.disabled || props.openPending} onChange={(e) => { selection.current++; setSelected(e.target.value); }}><option value="">Choose a workflow</option>{listing.records.map((record) => <option key={record.id} value={record.id}>{record.workflow.name}</option>)}</select></label>
      <button disabled={props.disabled || props.openPending || !selected} onClick={async () => {
        const revision = generation.current; const token = ++selection.current;
        const abort = new AbortController(); operation.current?.abort(); operation.current = abort;
        props.opening(true); setStatus("Opening workflow…");
        try {
          const next = await store.list({ signal: abort.signal });
          if (abort.signal.aborted || revision !== generation.current || token !== selection.current || currentProps.current.disabled) return;
          const record = next.records.find((r) => r.id === selected);
          if (!record) throw new Error("Saved workflow unavailable. Retry to refresh the list.");
          if (currentProps.current.activate(record.workflow, record)) { setStatus("Workflow opened. Upload a new source CSV."); setBackup(false); }
        } catch (error) { if (!abort.signal.aborted && revision === generation.current && token === selection.current) setStatus((error as Error).message); }
        finally { if (revision === generation.current && token === selection.current) currentProps.current.opening(false); }
      }}>Open workflow</button>
      <label>Import workflow<input aria-label="Import workflow" type="file" accept=".json,application/json" disabled={props.disabled || props.openPending} onChange={async (e) => {
        const file = e.target.files?.[0]; e.target.value = "";
        if (!file || currentProps.current.openPending) return;
        const revision = generation.current; const token = ++selection.current;
        try {
          if (file.size > 1024 * 1024) throw new Error("Workflow exceeds 1 MiB.");
          const workflow = decodeUsableWorkflow(await file.text());
          if (revision !== generation.current || token !== selection.current || currentProps.current.disabled) return;
          if (currentProps.current.activate(workflow)) { setStatus("Workflow imported as an unsaved draft. Upload a new source CSV."); setBackup(false); }
        } catch (error) { if (revision === generation.current && token === selection.current) setStatus((error as Error).message); }
      }} /></label>
      <button disabled={props.disabled} onClick={props.reset}>New conversion</button>
    </div>
    <div className="workflow-actions">
      <label>Workflow name<input value={props.workflow.name ?? ""} maxLength={4096} onChange={(e) => props.name(e.target.value)} /></label>
      <button ref={saveButton} disabled={props.writePending} onClick={() => save()}>{props.baseline ? "Save changes" : "Save workflow"}</button>
      {props.baseline && <button disabled={props.writePending} onClick={() => save(true)}>Save a copy</button>}
      <button onClick={download}>Download workflow</button>
      <span>{props.unsaved ? "Unsaved configuration" : props.baseline ? "Saved configuration" : "Working configuration"}</span>
    </div>
    <p className="helper">Workflow files contain field names and configured constants, which may reveal business information. Share them carefully. Source records and filenames are excluded.</p>
    {backup && <aside className="notice"><strong>Keep a portable backup.</strong> Download workflow now so you can recover it if browser data is cleared. <button onClick={download}>Download backup</button><button onClick={() => setBackup(false)}>Dismiss backup reminder</button></aside>}
    <p role="status">{status}</p>
    {listing.issues.map((issue, index) => <p key={index} role="status">{issue.message}</p>)}
    <button disabled={props.disabled || props.openPending} onClick={() => { void refresh(); }}>Retry workflow storage</button>
    <dialog className="column-dialog" ref={dialog} aria-labelledby="workflow-conflict-title" onCancel={() => setConflict(undefined)} onClose={() => saveButton.current?.focus()}>
      <h2 id="workflow-conflict-title">Workflow already exists</h2>
      <p>Choose one saved target to replace, or enter a distinct Workflow name and save a copy.</p>
      <label>Replace target<select aria-label="Replace target" value={target} onChange={(e) => setTarget(e.target.value)}>{conflict?.records.map((record) => <option key={record.id} value={record.id}>{record.workflow.name}</option>)}</select></label>
      <label>Replacement or copy name<input maxLength={4096} value={props.workflow.name ?? ""} onChange={(e) => props.name(e.target.value)} /></label>
      <div className="dialog-actions"><button disabled={props.writePending || !target} onClick={() => {
        const expected = conflict?.records.find((r) => r.id === target);
        if (expected && conflict) void write({ ...conflict.snapshot, id: expected.id, name: props.workflow.name }, expected);
      }}>Replace workflow</button><button disabled={props.writePending} onClick={() => save(true)}>Save a copy</button><button onClick={() => setConflict(undefined)}>Cancel</button></div>
    </dialog>
  </section>;
}
