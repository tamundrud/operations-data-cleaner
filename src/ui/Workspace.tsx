import { useEffect, useRef, useState } from "react";
import { Session, type SessionState } from "../session/controller";
import {
  makeWorkflow,
  decodeWorkflow,
  referencedHeaders,
  type Workflow,
  type Field,
} from "../engine/workflow";
import { displayValue } from "../engine/values";
import { exportText, type SafetyChoice } from "../formats/spreadsheet-safety";
import MappingRows from "./MappingRows";
import ExcelCellDetails from "./ExcelCellDetails";
import SavedWorkflows from "./SavedWorkflows";
import { snapshotWorkflow, encodeWorkflow } from "../workflows/codec";
import type { StoredWorkflow } from "../workflows/indexeddb-store";
import sampleSource from "../../examples/u2/source.csv?raw";
import sampleConfig from "../../examples/u2/workflow.json?raw";
import fixedSource from "../../examples/u3-source.csv?raw";
import fixedConfig from "../../examples/u3-workflow.json?raw";
function saveDownload(bytes: Uint8Array, format: Workflow["output"]["format"]) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `converted.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Workspace() {
  const [session] = useState(() => new Session());
  const [state, setState] = useState<SessionState>(session.state);
  const [workflow, setWorkflow] = useState<Workflow>(() => makeWorkflow([]));
  const [dirty, setDirty] = useState(true);
  const [delimiter, setDelimiter] = useState<"auto" | "," | ";" | "\t">("auto");
  const [choice, setChoice] = useState<SafetyChoice>();
  const [exceptions, setExceptions] = useState(false);
  const [worksheet, setWorksheet] = useState("");
  const [inspectSource, setInspectSource] = useState(false);
  const draftGeneration = useRef(0);
  const pendingGeneration = useRef<number | undefined>(undefined);
  const failedGeneration = useRef<number | undefined>(undefined);
  const [baseline, setBaseline] = useState<StoredWorkflow>();
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [activation, setActivation] = useState(0);
  const durableID = useRef<string | undefined>(undefined);
  const samplePending = useRef(false);
  const activePolicy = useRef<Workflow["source"]["delimiter"]>("auto");
  const currentWorkflow = useRef(workflow);
  currentWorkflow.current = workflow;
  const statusRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    session.onState = (s) => {
      setState(s);
      if (!s.view) setInspectSource(false);
      if (!s.busy) {
        setExceptions(s.view?.exceptions ?? false);
        const completed = pendingGeneration.current;
        if (completed !== undefined) {
          pendingGeneration.current = undefined;
          if (s.error || s.recoverable)
            failedGeneration.current = draftGeneration.current;
          else if (completed === draftGeneration.current) setDirty(false);
        }
      }
      if (s.error) { samplePending.current = false; statusRef.current?.focus(); }
    };
    session.onDownload = saveDownload;
    session.onSourcePolicy = (policy, format = "csv", worksheet) => {
      activePolicy.current = policy;
      setWorkflow((w) => ({ ...w, source: { ...w.source, delimiter: policy, format, worksheet } }));
    };
    session.onWorkflow = (w) => {
      if (samplePending.current) {
        samplePending.current = false;
        setBaseline(undefined);
        durableID.current = undefined;
        setRepeat(false);
      }
      draftGeneration.current++;
      pendingGeneration.current = undefined;
      failedGeneration.current = undefined;
      activePolicy.current = w.source.delimiter;
      setDelimiter(w.source.delimiter);
      setWorkflow(w);
      setDirty(false);
      setChoice(undefined);
    };
    return () => {
      session.onState = () => {};
      session.end();
    };
  }, [session]);
  const view = state.view;
  const sourceDetail = view?.worksheet
    ? `worksheet ${view.worksheet}`
    : `${view?.delimiter === "\t" ? "tab" : view?.delimiter === ";" ? "semicolon" : "comma"} delimiter detected`;
  const busy = Boolean(state.busy || state.worksheets);
  const changeWorkflow = (patch: Partial<Workflow>) => {
    draftGeneration.current++;
    failedGeneration.current = undefined;
    setWorkflow((w) => ({ ...w, ...patch }));
    setDirty(true);
    setChoice(undefined);
  };
  const change = (fields: Field[]) => changeWorkflow({ fields });
  const makeFields = (headers: string[]): Field[] =>
    headers.map((header) => ({
      id: crypto.randomUUID(),
      header,
      type: "text",
      required: false,
    }));
  session.onTemplate = (headers) => change(makeFields(headers));
  useEffect(() => {
    if (
      !dirty ||
      busy ||
      opening ||
      !view ||
      state.recoverable ||
      !workflow.fields.length ||
      failedGeneration.current === draftGeneration.current
    )
      return;
    const generation = draftGeneration.current;
    const timer = setTimeout(() => {
      if (
        session.state.busy ||
        opening ||
        session.state.recoverable ||
        generation !== draftGeneration.current
      )
        return;
      const current = {
        ...workflow,
        source: {
          ...workflow.source,
          referencedHeaders: referencedHeaders(workflow.fields),
        },
      };
      pendingGeneration.current = generation;
      session.configure(current);
    }, 250);
    return () => clearTimeout(timer);
  }, [dirty, busy, opening, view, state.recoverable, workflow, session]);
  let unsaved = workflow.fields.length > 0;
  if (baseline) {
    try { unsaved = encodeWorkflow({ ...workflow, source: { ...workflow.source, delimiter: activePolicy.current } }) !== baseline.json; }
    catch { unsaved = true; }
  }
  const confirmReplacement = () => !(unsaved || view || state.recoverable) || window.confirm("Replace the current conversion? Unsaved configuration and source data in this session will be discarded.");
  const resetWorking = () => {
    samplePending.current = false;
    setOpening(false);
    draftGeneration.current++;
    pendingGeneration.current = undefined;
    failedGeneration.current = undefined;
    setActivation((n) => n + 1);
    setChoice(undefined);
    setExceptions(false);
    durableID.current = undefined;
    setBaseline(undefined);
    session.end();
  };
  const activate = (next: Workflow, record?: StoredWorkflow) => {
    if (!confirmReplacement()) return false;
    resetWorking();
    setRepeat(true);
    setBaseline(record);
    session.activate(next);
    return true;
  };
  const newConversion = () => {
    if (!confirmReplacement()) return;
    resetWorking();
    activePolicy.current = "auto";
    setDelimiter("auto");
    setWorkflow(makeWorkflow([]));
    setDirty(true);
    setRepeat(false);
  };
  const snapshot = (copy = false) => {
    const current = currentWorkflow.current;
    const next = snapshotWorkflow({ ...current, source: { ...current.source, delimiter: activePolicy.current } });
    if (copy) next.id = crypto.randomUUID();
    else if (next.id === "draft") next.id = durableID.current ??= crypto.randomUUID();
    return next;
  };
  const saved = (record: StoredWorkflow) => {
    setBaseline(record);
    durableID.current = record.id;
    setWorkflow((w) => ({ ...w, id: record.id,
      name: w.name?.trim() === record.workflow.name ? record.workflow.name : w.name }));
  };
  const sample = async (fixed = false) => {
    setChoice(undefined);
    setActivation((n) => n + 1);
    samplePending.current = true;
    await session.upload(
      new File([fixed ? fixedSource : sampleSource], fixed ? "synthetic-fixed-fields.csv" : "synthetic-orders.csv", { type: "text/csv" }),
      ",",
      { workflow: decodeWorkflow(fixed ? fixedConfig : sampleConfig) },
    );
  };
  const validPreview =
    view &&
    !dirty &&
    !busy &&
    !opening &&
    !state.recoverable &&
    view.workflowIssues.length === 0;
  const risk = Boolean(
    validPreview && workflow.output.format === "csv" && (view.csvRisk || view.riskyHeaders.length),
  );
  const canExport = Boolean(
    validPreview &&
      view.summary.candidates > 0 &&
      !view.summary.invalid &&
      (!risk || choice),
  );
  const outputDelimiterLabel = { ",": "comma", ";": "semicolon", "\t": "tab" }[workflow.output.delimiter];
  return (
    <main>
      <header className="masthead">
        <div>
          <p className="eyebrow">OPERATIONS DATA CLEANER · EXCEL & CSV PREVIEW</p>
          <h1>Match your columns.</h1>
          <p>Map a source table to the columns your import needs.</p>
        </div>
        <div className="privacy">
          <strong>Processed in your browser</strong>
          <span>No account. Files stay in memory.</span>
        </div>
      </header>
      <nav aria-label="Conversion steps" className="steps">
        <span>1 · Upload table</span>
        <span>2 · Map columns</span>
        <span>3 · Preview & download</span>
      </nav>
      <SavedWorkflows workflow={workflow} baseline={baseline} disabled={busy || saving} writePending={saving || opening}
        openPending={opening} opening={setOpening}
        generation={activation} unsaved={unsaved}
        name={(name) => setWorkflow((w) => ({ ...w, name }))}
        snapshot={snapshot} activate={activate} saved={saved} saving={setSaving} reset={newConversion} />
      {repeat && <section className="panel repeat-summary" aria-label="Repeat workflow">
        <h2>{workflow.name || "Imported workflow"}</h2>
        <p>{workflow.fields.length} output columns. Upload a compatible source CSV or Excel file, review the current results, then download.</p>
        <p>{workflow.output.format === "xlsx" ? `Excel output · ${workflow.output.dateSystem} date system` : `CSV output: ${outputDelimiterLabel} · ${workflow.output.bom ? "with BOM" : "no BOM"}`} · {workflow.output.header ? "with header" : "no header"}</p>
        <button onClick={() => setRepeat(false)}>Edit workflow</button>
      </section>}
      <section aria-labelledby="upload-title" className="panel upload">
        <div>
          <h2 id="upload-title">1. Choose your source</h2>
          <p>
            UTF-8 CSV or .xlsx with a header row. Choose one worksheet. Leading zeros and spaces are preserved.
          </p>
        </div>
        <div className="upload-controls">
          <label>
            Source delimiter (CSV)
            <select
              value={delimiter}
              disabled={busy || saving || opening}
              onChange={(e) => setDelimiter(e.target.value as typeof delimiter)}
            >
              <option value="auto">Detect automatically</option>
              <option value=",">Comma</option>
              <option value=";">Semicolon</option>
              <option value={"\t"}>Tab</option>
            </select>
          </label>
          <label className="file-label">
            Upload source CSV or Excel
            <input
              type="file"
              aria-label="Upload source CSV"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy || saving || opening}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && !opening) {
                  setChoice(undefined);
                  setWorksheet("");
                  void session.upload(file, delimiter, { worksheet: repeat ? workflow.source.worksheet : undefined });
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            disabled={busy || saving || opening}
            onClick={() => {
              void sample();
            }}
          >
            Try sample data
          </button>
          <button disabled={busy || saving || opening} onClick={() => { void sample(true); }}>
            Try fixed fields example
          </button>
          {(view || state.recoverable) && (
            <button
              disabled={busy || saving || opening}
              onClick={() => {
                resetWorking();
                setWorkflow(makeWorkflow([]));
                activePolicy.current = "auto";
                setDelimiter("auto");
                setDirty(true);
                setRepeat(false);
              }}
            >
              End session
            </button>
          )}
        </div>
      </section>
      {state.worksheets && <section className="panel" aria-label="Choose Excel worksheet">
        <h2>Choose one worksheet</h2>
        <p>Sheets are never merged. The current conversion stays available if you cancel.</p>
        <label>Worksheet
          <select aria-label="Worksheet" value={state.worksheets.includes(worksheet) ? worksheet : ""} onChange={(e) => setWorksheet(e.target.value)}>
            <option value="">Choose a worksheet</option>
            {state.worksheets.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button disabled={!state.worksheets.includes(worksheet)} onClick={() => session.selectWorksheet(worksheet)}>Import selected worksheet</button>
        <button onClick={() => { session.cancelWorksheetSelection(); setWorksheet(""); }}>Cancel worksheet selection</button>
      </section>}
      <div className="status-bar">
        <p
          ref={statusRef}
          tabIndex={-1}
          role={state.error ? "alert" : "status"}
        >
          {state.error ||
            state.busy ||
            (view
              ? `Source loaded · ${view.summary.candidates.toLocaleString()} candidate rows · ${sourceDetail}. Verify the source columns below.`
              : "Start with your CSV or Excel file, or try the fictional example.")}
        </p>
        {state.busy && (
          <button
            onClick={() => {
              setChoice(undefined);
              session.cancel();
            }}
          >
            Cancel processing
          </button>
        )}
        {state.recoverable && (
          <button
            onClick={() => {
              setChoice(undefined);
              failedGeneration.current = undefined;
              void session.retry();
            }}
          >
            Retry active file
          </button>
        )}
      </div>
      {view && (
        <div className="workspace">
          <details className="panel source-inspection" onToggle={(event) => {
            if (event.target === event.currentTarget) setInspectSource(event.currentTarget.open);
          }}>
            <summary>Inspect original source table</summary>
            {inspectSource && <section aria-labelledby="source-title">
              <h2 id="source-title">Source table</h2>
              <p>
                Original values · first {view.sourceRows.length} rows · read
                only
              </p>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Source table, scroll horizontally"
              >
                <table>
                  <caption>
                    {view.worksheet ? `Worksheet ${view.worksheet} · ` : ""}Uploaded source columns and original record references
                  </caption>
                  <thead>
                    <tr>
                      <th>Source record / line</th>
                      {view.columns.map((c) => (
                        <th key={c.key}>{c.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {view.sourceRows.map((r) => (
                      <tr key={r.id}>
                        <th>
                          {r.record} / {r.line}
                        </th>
                        {view.columns.map((c) => (
                          <td key={c.key}>
                            {r.cells[c.position]?.display ?? ""}
                            {r.cells[c.position]?.excel && <ExcelCellDetails cell={r.cells[c.position].excel!} />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>}
          </details>
          {!repeat && <MappingRows key={activation}
            view={view}
            fields={workflow.fields}
            disabled={opening || (busy && state.busy !== "Checking all rows…")}
            importing={busy || opening}
            change={change}
            makeFields={makeFields}
            importTemplate={(file) => {
              setChoice(undefined);
              setWorksheet("");
              void session.upload(file, delimiter, { template: true });
            }}
          />}
          <section className="panel review" aria-labelledby="preview-title">
            <h2 id="preview-title">3. Preview & download</h2>
            {!repeat && <fieldset className="csv-options" disabled={opening || (busy && state.busy !== "Checking all rows…")}>
              <legend>Output settings</legend>
              <div className="csv-controls">
                <label>Output format
                  <select aria-label="Output format" value={workflow.output.format} onChange={(e) => changeWorkflow({ output: { ...workflow.output, format: e.target.value as Workflow["output"]["format"] } })}>
                    <option value="csv">CSV (.csv)</option>
                    <option value="xlsx">Excel workbook (.xlsx)</option>
                  </select>
                </label>
                {workflow.output.format === "csv" ? <><label>CSV delimiter
                  <select aria-label="CSV delimiter" value={workflow.output.delimiter} onChange={(e) => changeWorkflow({ output: { ...workflow.output, delimiter: e.target.value as Workflow["output"]["delimiter"] } })}>
                    <option value=",">Comma</option>
                    <option value=";">Semicolon</option>
                    <option value={"\t"}>Tab</option>
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" checked={workflow.output.bom} onChange={(e) => changeWorkflow({ output: { ...workflow.output, bom: e.target.checked } })} />
                  Include UTF-8 BOM
                </label></> : <label>Excel date system
                  <select aria-label="Excel date system" value={workflow.output.dateSystem} onChange={(e) => changeWorkflow({ output: { ...workflow.output, dateSystem: e.target.value as Workflow["output"]["dateSystem"] } })}>
                    <option value="1900">1900 (standard)</option>
                    <option value="1904">1904</option>
                  </select>
                </label>}
                <label className="check">
                  <input type="checkbox" checked={workflow.output.header} onChange={(e) => changeWorkflow({ output: { ...workflow.output, header: e.target.checked } })} />
                  Include header row
                </label>
              </div>
              <p className="helper">{workflow.output.format === "csv" ? "UTF-8 encoding · CRLF line endings." : "Fresh value-only workbook. Text stays literal, including leading zeros and formula-like text. Numbers must fit Excel precision; dates keep their calendar meaning and chosen display format."} Settings update preview automatically.</p>
              {!workflow.output.header && <p className="helper">Column labels identify fields in preview only. The downloaded file has no header row.</p>}
            </fieldset>}
            {!workflow.fields.length ? (
              <p className="notice">
                Add an output column or import a template to start matching.
              </p>
            ) : dirty || busy ? (
              <p className="notice">
                {busy
                  ? "Preparing the current preview… Download is blocked until processing finishes."
                  : "Updating preview automatically… Download stays blocked until the current mappings are checked."}
              </p>
            ) : (
              <>
                <div className="counts" aria-label="Full dataset counts">
                  <span>
                    Input rows <strong>{view.summary.inputRows}</strong>
                  </span>
                  <span>
                    Skipped blanks <strong>{view.summary.skippedBlanks}</strong>
                  </span>
                  <span>
                    Candidate rows <strong>{view.summary.candidates}</strong>
                  </span>
                  <span>
                    Valid <strong>{view.summary.valid}</strong>
                  </span>
                  <span>
                    Warning rows <strong>{view.summary.warningOnly}</strong>
                  </span>
                  <span>
                    Invalid <strong>{view.summary.invalid}</strong>
                  </span>
                  <span>
                    Warning issues <strong>{view.summary.warningIssues}</strong>
                  </span>
                  <span>
                    Error issues <strong>{view.summary.errorIssues}</strong>
                  </span>
                  <span>
                    Corrected <strong>0</strong>
                  </span>
                  <span>
                    Excluded <strong>0</strong>
                  </span>
                </div>
                {view.workflowIssues.length > 0 && (
                  <div className="notice" role="alert">
                    <strong>Mapping needs attention</strong>
                    <ul>
                      {view.workflowIssues.map((issue, i) => (
                        <li key={i}>
                          {issue.reason} {issue.action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {view.summary.invalid > 0 && (
                  <p className="notice" role="alert">
                    Download blocked: {view.summary.invalid} invalid rows.
                    Review exceptions, fix the source file and upload it again,
                    or update validation. This preview does not exclude rows.
                  </p>
                )}
                {risk && (
                  <fieldset className="safety" disabled={busy || saving || opening}>
                    <legend>
                      Spreadsheet formula warning — choose before download
                    </legend>
                    <p>
                      Some text or headers may be interpreted as formulas.
                      Escaping adds an apostrophe and changes the exported text;
                      raw text may be unsafe to open in spreadsheets. No CSV
                      escape policy protects every importer.
                    </p>
                    {view.riskyHeaders.length > 0 && (
                      <p>
                        Risky output headers: {view.riskyHeaders.join(", ")}
                      </p>
                    )}
                    <label className="check">
                      <input
                        type="radio"
                        name="safety"
                        checked={choice === "escape"}
                        onChange={() => setChoice("escape")}
                      />
                      Escape risky text with an apostrophe
                    </label>
                    <label className="check">
                      <input
                        type="radio"
                        name="safety"
                        checked={choice === "raw"}
                        onChange={() => setChoice("raw")}
                      />
                      Preserve raw text for TMS import — do not open in
                      spreadsheets
                    </label>
                    {choice && (
                      <p>
                        Preview below shows the actual{" "}
                        {choice === "escape" ? "escaped" : "raw"} export
                        representation.
                      </p>
                    )}
                  </fieldset>
                )}
                {view.workflowIssues.length === 0 && (
                  <>
                    <label className="check">
                      <input
                        type="checkbox"
                        disabled={busy || saving || opening}
                        checked={exceptions}
                        onChange={(e) => {
                          setExceptions(e.target.checked);
                          session.page(0, e.target.checked);
                        }}
                      />
                      Show only rows with exceptions (
                      {view.summary.warningOnly + view.summary.invalid})
                    </label>
                    <div
                      className="table-scroll"
                      tabIndex={0}
                      role="region"
                      aria-label="Output preview, scroll horizontally"
                    >
                      <table>
                        <caption>
                          Output preview · page {view.page + 1} of{" "}
                          {view.totalPages} ·{" "}
                          {risk && !choice
                            ? "choose formula handling for final representation"
                            : "download representation"}
                        </caption>
                        <thead>
                          <tr>
                            <th>Source record / line</th>
                            <th>Status</th>
                            {workflow.fields.map((f) => (
                              <th key={f.id}>{exportText(f.header, workflow.output.format === "csv" ? choice : undefined)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {view.rows.map((r) => (
                            <tr key={r.id}>
                              <th>
                                {r.record} / {r.line}
                              </th>
                              <td>{r.status}</td>
                              {r.values.map((v, i) => (
                                <td key={workflow.fields[i].id}>
                                  {v.kind === "text"
                                    ? exportText(v.text, workflow.output.format === "csv" ? choice : undefined)
                                    : displayValue(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="pagination">
                      <button
                        disabled={busy || opening || view.page === 0}
                        onClick={() =>
                          session.page(view.page - 1, view.exceptions)
                        }
                      >
                        Previous page
                      </button>
                      <span>
                        Page {view.page + 1} of {view.totalPages}
                      </span>
                      <button
                        disabled={busy || opening || view.page + 1 >= view.totalPages}
                        onClick={() =>
                          session.page(view.page + 1, view.exceptions)
                        }
                      >
                        Next page
                      </button>
                    </div>
                    {view.exceptions && (
                      <ul className="issues">
                        {view.rows
                          .flatMap((r) => r.issues)
                          .map((issue, i) => (
                            <li key={i}>
                              <strong>
                                Record {issue.record}, line {issue.line}:
                              </strong>{" "}
                              {issue.reason} {issue.action}
                            </li>
                          ))}
                      </ul>
                    )}
                  </>
                )}
              </>
            )}
            <button
              className="primary download"
              disabled={!canExport}
              onClick={() => session.export(choice)}
            >
              Download converted {workflow.output.format === "xlsx" ? "Excel" : "CSV"}
            </button>
            <p className="small">
              Validation checks your chosen rules. Acceptance by your
              destination system depends on its import requirements.
            </p>
          </section>
        </div>
      )}
      <footer>
        U10 internal preview · CSV and one-sheet Excel conversion with reusable local workflows. Data is cleared on reload
        or End session. Source data and file names are never saved. Static
        application assets are requested from the host; customer file processing
        stays local.
      </footer>
    </main>
  );
}
