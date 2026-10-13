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
import sampleSource from "../../examples/u2/source.csv?raw";
import sampleConfig from "../../examples/u2/workflow.json?raw";
function saveDownload(bytes: Uint8Array) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "converted.csv";
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
  const [manual, setManual] = useState("");
  const nextID = useRef(0);
  const statusRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    session.onState = (s) => {
      setState(s);
      if (!s.busy) setExceptions(s.view?.exceptions ?? false);
      if (s.error) statusRef.current?.focus();
    };
    session.onDownload = saveDownload;
    session.onWorkflow = (w) => {
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
  const busy = Boolean(state.busy);
  const change = (fields: Field[]) => {
    setWorkflow((w) => ({ ...w, fields }));
    setDirty(true);
    setChoice(undefined);
  };
  session.onTemplate = (headers) =>
    change(
      headers.map((header) => ({
        id: `manual-${nextID.current++}`,
        header,
        type: "text",
        required: false,
      })),
    );
  const update = (id: string, patch: Partial<Field>) =>
    change(workflow.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const move = (index: number, direction: number) => {
    const fields = [...workflow.fields];
    [fields[index], fields[index + direction]] = [
      fields[index + direction],
      fields[index],
    ];
    change(fields);
  };
  const preview = () => {
    const w = {
      ...workflow,
      source: {
        ...workflow.source,
        referencedHeaders: referencedHeaders(workflow.fields),
      },
    };
    setWorkflow(w);
    setDirty(false);
    setChoice(undefined);
    session.configure(w);
  };
  const sample = async () => {
    setChoice(undefined);
    await session.upload(
      new File([sampleSource], "synthetic-orders.csv", { type: "text/csv" }),
      ",",
      { workflow: decodeWorkflow(sampleConfig) },
    );
  };
  const validPreview =
    view &&
    !dirty &&
    !busy &&
    !state.recoverable &&
    view.workflowIssues.length === 0;
  const risk = Boolean(
    validPreview && (view.summary.warningIssues || view.riskyHeaders.length),
  );
  const canExport = Boolean(
    validPreview &&
      view.summary.candidates > 0 &&
      !view.summary.invalid &&
      (!risk || choice),
  );
  return (
    <main>
      <header className="masthead">
        <div>
          <p className="eyebrow">OPERATIONS DATA CLEANER · CSV PREVIEW</p>
          <h1>Make your columns fit.</h1>
          <p>Map a source table to the columns your import needs.</p>
        </div>
        <div className="privacy">
          <strong>Processed in your browser</strong>
          <span>No account. Files stay in memory.</span>
        </div>
      </header>
      <nav aria-label="Conversion steps" className="steps">
        <span>1 · Upload CSV</span>
        <span>2 · Map columns</span>
        <span>3 · Preview & download</span>
      </nav>
      <section aria-labelledby="upload-title" className="panel upload">
        <div>
          <h2 id="upload-title">1. Choose your source</h2>
          <p>
            UTF-8 CSV with a header row. Leading zeros and spaces are preserved.
          </p>
        </div>
        <div className="upload-controls">
          <label>
            Source delimiter
            <select
              value={delimiter}
              disabled={busy}
              onChange={(e) => setDelimiter(e.target.value as typeof delimiter)}
            >
              <option value="auto">Detect automatically</option>
              <option value=",">Comma</option>
              <option value=";">Semicolon</option>
              <option value={"\t"}>Tab</option>
            </select>
          </label>
          <label className="file-label">
            Upload source CSV
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setChoice(undefined);
                  void session.upload(file, delimiter);
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            disabled={busy}
            onClick={() => {
              void sample();
            }}
          >
            Try sample data
          </button>
          {(view || state.recoverable) && (
            <button
              disabled={busy}
              onClick={() => {
                session.end();
                setWorkflow(makeWorkflow([]));
                setDirty(true);
                setChoice(undefined);
              }}
            >
              End session
            </button>
          )}
        </div>
      </section>
      <div className="status-bar">
        <p
          ref={statusRef}
          tabIndex={-1}
          role={state.error ? "alert" : "status"}
        >
          {state.error ||
            state.busy ||
            (view
              ? `Source loaded · ${view.summary.candidates.toLocaleString()} candidate rows · ${view.delimiter === "\t" ? "tab" : view.delimiter === ";" ? "semicolon" : "comma"} delimiter detected. Verify the source columns below.`
              : "Start with your CSV, or try the fictional example.")}
        </p>
        {busy && (
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
              void session.retry();
            }}
          >
            Retry active file
          </button>
        )}
      </div>
      {view && (
        <div className="workspace">
          <section className="panel source" aria-labelledby="source-title">
            <h2 id="source-title">Source table</h2>
            <p>
              Original values · first {view.sourceRows.length} rows · read only
            </p>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Source table, scroll horizontally"
            >
              <table>
                <caption>
                  Uploaded source columns and original record references
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
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel mapping" aria-labelledby="map-title">
            <h2 id="map-title">2. Define output columns</h2>
            <p>
              Enter the names your import expects, then choose a source for
              each. Nothing is mapped automatically.
            </p>
            <fieldset disabled={busy}>
              <legend>Destination columns</legend>
              <label>
                Upload destination CSV template
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void session.upload(file, delimiter, { template: true });
                    e.target.value = "";
                  }}
                />
              </label>
              <form
                className="manual"
                onSubmit={(e) => {
                  e.preventDefault();
                  const headers = manual.split("\n").filter((h) => h.trim());
                  if (headers.length) {
                    change([
                      ...workflow.fields,
                      ...headers.map((header) => ({
                        id: `manual-${nextID.current++}`,
                        header,
                        type: "text" as const,
                        required: false,
                      })),
                    ]);
                    setManual("");
                  }
                }}
              >
                <label>
                  New column names (one per line)
                  <textarea
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    rows={2}
                    placeholder={"Reference\nConsignee"}
                  />
                </label>
                <button
                  type="submit"
                  disabled={!manual.trim() || workflow.fields.length >= 200}
                >
                  Add columns
                </button>
              </form>
              <ol className="fields">
                {workflow.fields.map((f, i) => (
                  <li key={f.id} className="field-card">
                    <div className="field-top">
                      <span className="number">{i + 1}</span>
                      <label>
                        Output column name
                        <input
                          value={f.header}
                          onChange={(e) =>
                            update(f.id, { header: e.target.value })
                          }
                        />
                      </label>
                      <span className="badge">
                        {f.recipe ? "Confirmed" : "Unmapped"}
                      </span>
                    </div>
                    <label>
                      Copy from source
                      <select
                        aria-label={`Copy source for ${f.header || `column ${i + 1}`}`}
                        value={f.recipe?.kind === "copy" ? f.recipe.source : ""}
                        onChange={(e) =>
                          update(f.id, {
                            recipe: e.target.value
                              ? { kind: "copy", source: e.target.value }
                              : undefined,
                          })
                        }
                      >
                        <option value="">Choose a source column…</option>
                        {view.columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.header}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="small">
                      Type: text · no trimming or conversion
                    </p>
                    <details>
                      <summary>Validation (optional)</summary>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={f.required}
                          onChange={(e) =>
                            update(f.id, { required: e.target.checked })
                          }
                        />
                        Required value
                      </label>
                      <label>
                        Maximum characters
                        <input
                          type="number"
                          min="1"
                          max="1000000"
                          value={f.maxLength ?? ""}
                          onChange={(e) =>
                            update(f.id, {
                              maxLength:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </details>
                    <div className="field-actions">
                      <button
                        aria-label={`Move ${f.header} up`}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        Move up
                      </button>
                      <button
                        aria-label={`Move ${f.header} down`}
                        disabled={i === workflow.fields.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        Move down
                      </button>
                      <button
                        aria-label={`Remove ${f.header}`}
                        onClick={() =>
                          change(workflow.fields.filter((x) => x.id !== f.id))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                className="primary"
                onClick={preview}
                disabled={!workflow.fields.length}
              >
                Preview all rows
              </button>
            </fieldset>
          </section>
          <section className="panel review" aria-labelledby="preview-title">
            <h2 id="preview-title">3. Preview & download</h2>
            <p className="export-settings">
              <strong>CSV export:</strong> UTF-8 · no BOM · comma · header row ·
              CRLF
            </p>
            {dirty || busy ? (
              <p className="notice">
                {busy
                  ? "Preparing the current preview… Download is blocked until processing finishes."
                  : "Choose your mappings, then select Preview all rows. Changes need a fresh preview before download."}
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
                  <fieldset className="safety" disabled={busy}>
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
                        disabled={busy}
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
                              <th key={f.id}>{exportText(f.header, choice)}</th>
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
                                    ? exportText(v.text, choice)
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
                        disabled={busy || view.page === 0}
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
                        disabled={busy || view.page + 1 >= view.totalPages}
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
              Download converted CSV
            </button>
            <p className="small">
              Validation checks your chosen rules. Acceptance by your
              destination system depends on its import requirements.
            </p>
          </section>
        </div>
      )}
      <footer>
        U2 internal preview · CSV copy mapping only. Data is cleared on reload
        or End session. Source data and file names are never saved. Static
        application assets are requested from the host; customer file processing
        stays local.
      </footer>
    </main>
  );
}
