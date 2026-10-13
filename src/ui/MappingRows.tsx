import { useRef, useState } from "react";
import type { Field } from "../engine/workflow";
import type { View } from "../session/worker-protocol";

type Props = {
  view: View;
  fields: Field[];
  disabled: boolean;
  importing: boolean;
  change: (fields: Field[]) => void;
  makeFields: (headers: string[]) => Field[];
  importTemplate: (file: File) => void;
};

export default function MappingRows({
  view,
  fields,
  disabled,
  importing,
  change,
  makeFields,
  importTemplate,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string>();
  const [dragged, setDragged] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [manual, setManual] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [template, setTemplate] = useState<File>();
  const names = useRef(new Map<string, HTMLInputElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const manualHeaders = manual.split("\n").filter((h) => h.trim());
  const columns = view.columns.filter((c) =>
    c.header.toLowerCase().includes(search.toLowerCase()),
  );
  const sample = (key: string) => {
    const col = view.columns.find((c) => c.key === key);
    return col
      ? view.sourceRows
          .slice(0, 2)
          .map((r) => r.cells[col.position]?.display ?? "")
          .join(" · ")
      : "";
  };
  const update = (id: string, patch: Partial<Field>) =>
    change(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const match = (field: Field, key: string) => {
    const column = view.columns.find((c) => c.key === key);
    if (disabled || !column) return;
    update(field.id, { recipe: { kind: "copy", source: key } });
    setAnnouncement(
      `${field.header || "Output column"} now copies ${column.header}.`,
    );
    setSelected(undefined);
    setDragged(undefined);
    setTarget(undefined);
    document.getElementById(`source-${field.id}`)?.focus();
  };
  const move = (index: number, direction: number) => {
    const reordered = [...fields];
    [reordered[index], reordered[index + direction]] = [
      reordered[index + direction],
      reordered[index],
    ];
    change(reordered);
    setAnnouncement(
      `${fields[index].header} moved to position ${index + direction + 1}.`,
    );
  };
  const remove = (index: number) => {
    const next = fields[index + 1] ?? fields[index - 1];
    change(fields.filter((_, i) => i !== index));
    setAnnouncement(`${fields[index].header || "Output column"} removed.`);
    if (next) names.current.get(next.id)?.focus();
    else addButton.current?.focus();
  };
  return (
    <section
      className="panel matching"
      aria-labelledby="map-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setSelected(undefined);
          setAnnouncement("Source selection cancelled.");
        }
      }}
    >
      <div className="matching-heading">
        <div>
          <h2 id="map-title">2. Match your columns</h2>
          <p>
            Drag a source beside an output name, or choose it from the list.
          </p>
        </div>
        <div className="matching-tools">
          <label className="template-button">
            Import output template
            <input
              type="file"
              aria-label="Upload destination CSV template"
              accept=".csv,text/csv"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (fields.length) setTemplate(file);
                  else importTemplate(file);
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            ref={addButton}
            disabled={disabled || fields.length >= 200}
            onClick={() => {
              const added = makeFields([""]);
              change([...fields, ...added]);
              requestAnimationFrame(() =>
                names.current.get(added[0].id)?.focus(),
              );
            }}
          >
            + Add output column
          </button>
        </div>
      </div>
      {template && (
        <div className="notice" role="alert">
          <p>
            Replace all output columns and mappings with the template headers?
            The source stays unchanged.
          </p>
          <button
            disabled={importing}
            onClick={() => {
              importTemplate(template);
              setTemplate(undefined);
            }}
          >
            Replace output columns
          </button>{" "}
          <button onClick={() => setTemplate(undefined)}>
            Keep current columns
          </button>
        </div>
      )}
      <div className="matching-workspace">
        <aside className="source-picker" aria-label="Available source columns">
          <h3>
            Available sources <span>{view.columns.length}</span>
          </h3>
          <label className="source-search">
            Search source columns
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <p className="small">
            Sample values · sources can be used more than once
          </p>
          <div className="source-list">
            {columns.map((c) => (
              <button
                key={c.key}
                className={`source-item ${selected === c.key ? "selected" : ""}`}
                aria-label={`Select source ${c.header}`}
                aria-pressed={selected === c.key}
                disabled={disabled}
                draggable={!disabled}
                onClick={() => {
                  setSelected(selected === c.key ? undefined : c.key);
                  setAnnouncement(
                    selected === c.key
                      ? "Source selection cancelled."
                      : `${c.header} selected. Choose Match on an output row, or press Escape to cancel.`,
                  );
                }}
                onDragStart={(e) => {
                  setDragged(c.key);
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", c.key);
                }}
                onDragEnd={() => {
                  setDragged(undefined);
                  setTarget(undefined);
                }}
              >
                <strong>{c.header}</strong>
                <span className="source-sample">{sample(c.key)}</span>
              </button>
            ))}
            {!columns.length && (
              <p className="small">No source columns match this search.</p>
            )}
          </div>
        </aside>
        <div className="destination-list">
          <div className="row-heading">
            <span>Source mapping</span>
            <span>
              Output column <small>· exported in this order</small>
            </span>
          </div>
          {!fields.length && (
            <p className="empty-columns">
              Import a header template or add the columns your import needs.
            </p>
          )}
          <ol className="mapping-rows">
            {fields.map((f, i) => {
              const key = f.recipe?.kind === "copy" ? f.recipe.source : "";
              return (
                <li key={f.id}>
                  <div className="mapping-row">
                    <span className="row-number">{i + 1}</span>
                    <div
                      className={`mapping-position ${key ? "mapped" : "unmapped"} ${target === f.id ? "drop-target" : ""}`}
                      role="group"
                      aria-label={`Mapping position for ${f.header || `column ${i + 1}`}`}
                      onDragOver={(e) => {
                        if (!disabled && dragged) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                          setTarget(f.id);
                        }
                      }}
                      onDragLeave={() => setTarget(undefined)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragged) match(f, dragged);
                      }}
                    >
                      <label className="sr-only" htmlFor={`source-${f.id}`}>
                        Copy source for {f.header || `column ${i + 1}`}
                      </label>
                      <select
                        id={`source-${f.id}`}
                        value={key}
                        disabled={disabled}
                        onChange={(e) => {
                          if (e.target.value) match(f, e.target.value);
                          else {
                            update(f.id, { recipe: undefined });
                            setAnnouncement(`${f.header} is unmapped.`);
                          }
                        }}
                      >
                        <option value="">Drop or choose a source…</option>
                        {view.columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.header}
                          </option>
                        ))}
                      </select>
                      {key && (
                        <span className="source-sample">{sample(key)}</span>
                      )}
                      {selected && (
                        <button
                          className="match-action"
                          disabled={disabled}
                          aria-label={`Match selected source to ${f.header || `column ${i + 1}`}`}
                          onClick={() => match(f, selected)}
                        >
                          Match
                        </button>
                      )}
                      {key && (
                        <button
                          className="unlink-action"
                          disabled={disabled}
                          aria-label={`Unlink ${f.header}`}
                          title="Remove match"
                          onClick={(e) => {
                            update(f.id, { recipe: undefined });
                            setAnnouncement(`${f.header} is unmapped.`);
                            (
                              e.currentTarget.parentElement?.querySelector(
                                "select",
                              ) as HTMLSelectElement
                            )?.focus();
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <span className="row-arrow" aria-hidden="true">
                      →
                    </span>
                    <div className="output-name">
                      <label className="sr-only" htmlFor={`name-${f.id}`}>
                        Output column name
                      </label>
                      <input
                        id={`name-${f.id}`}
                        ref={(node) => {
                          if (node) names.current.set(f.id, node);
                          else names.current.delete(f.id);
                        }}
                        value={f.header}
                        placeholder="Name this output column"
                        disabled={disabled}
                        onChange={(e) =>
                          update(f.id, { header: e.target.value })
                        }
                      />
                    </div>
                    <div className="row-actions">
                      <button
                        disabled={disabled || i === 0}
                        aria-label={`Move ${f.header} up`}
                        title="Move up"
                        onClick={() => move(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        disabled={disabled || i === fields.length - 1}
                        aria-label={`Move ${f.header} down`}
                        title="Move down"
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </button>
                      <button
                        disabled={disabled}
                        aria-label={`Remove ${f.header}`}
                        title="Remove output column"
                        onClick={() => remove(i)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <details className="row-settings">
                    <summary>Validation (optional)</summary>
                    <fieldset disabled={disabled}>
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
                      <p className="small">
                        Text copied exactly · no trimming or conversion
                      </p>
                    </fieldset>
                  </details>
                </li>
              );
            })}
          </ol>
          <details className="bulk-columns">
            <summary>Add several columns</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const headers = manualHeaders;
                if (headers.length && fields.length + headers.length <= 200) {
                  change([...fields, ...makeFields(headers)]);
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
                />
              </label>
              <button
                disabled={
                  disabled ||
                  !manual.trim() ||
                  fields.length + manualHeaders.length > 200
                }
              >
                Add columns
              </button>
            </form>
          </details>
        </div>
      </div>
      <p className="mapping-status" role="status" aria-live="polite">
        {announcement ||
          `${fields.filter((f) => f.recipe).length} of ${fields.length} outputs mapped. No matches are guessed.`}
      </p>
    </section>
  );
}
