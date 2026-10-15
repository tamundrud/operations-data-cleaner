import { useEffect, useRef, useState, type DragEvent } from "react";
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
type Card = { kind: "source" | "output" | "pair"; id: string };
const sourceKey = (f: Field) =>
  f.recipe?.kind === "copy" ? f.recipe.source : "";

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
  const [selected, setSelected] = useState<Card>();
  const [dragging, setDragging] = useState<Card>();
  const drag = useRef<Card>(undefined);
  const [target, setTarget] = useState<string>();
  const [manual, setManual] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [template, setTemplate] = useState<File>();
  const [editing, setEditing] = useState<string>();
  const [orderOpen, setOrderOpen] = useState(false);
  const settings = useRef<HTMLDialogElement>(null);
  const order = useRef<HTMLDialogElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const focus = (id: string) =>
    requestAnimationFrame(() => cards.current.get(id)?.focus());
  const matched = fields.filter((f) => sourceKey(f));
  const unmatched = fields.filter((f) => !sourceKey(f));
  const positions = new Map(fields.map((f, i) => [f, i + 1]));
  const usesBySource = new Map<string, number>();
  for (const f of matched) {
    const key = sourceKey(f);
    usesBySource.set(key, (usesBySource.get(key) ?? 0) + 1);
  }
  const field = fields.find((f) => f.id === editing);
  const manualHeaders = manual.split("\n").filter((h) => h.trim());
  const columns = view.columns.filter((c) =>
    c.header.toLowerCase().includes(search.toLowerCase()),
  );
  const columnByKey = new Map(view.columns.map((c) => [c.key, c]));
  const sample = (key: string) => {
    const c = columnByKey.get(key);
    return c
      ? view.sourceRows
          .slice(0, 2)
          .map((r) => r.cells[c.position]?.display ?? "")
          .join(" · ")
      : "";
  };
  useEffect(() => {
    if (editing && settings.current && !settings.current.open)
      settings.current.showModal();
    if (!editing && settings.current?.open) settings.current.close();
  }, [editing]);
  useEffect(() => {
    if (orderOpen) order.current?.showModal();
    else order.current?.close();
  }, [orderOpen]);
  const update = (id: string, patch: Partial<Field>) =>
    change(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const clearDrag = () => {
    drag.current = undefined;
    setDragging(undefined);
    setTarget(undefined);
  };
  const match = (id: string, key: string) => {
    const f = fields.find((f) => f.id === id),
      c = columnByKey.get(key);
    if (disabled || !f || !c) return;
    update(id, { recipe: { kind: "copy", source: key } });
    setAnnouncement(
      `${f.header || "Output column"} now copies ${c.header}. Export order unchanged.`,
    );
    setSelected(undefined);
    clearDrag();
    focus(`output-${id}`);
  };
  const select = (card: Card) => {
    if (disabled) return;
    if (selected && selected.kind !== card.kind) {
      match(
        card.kind === "output" ? card.id : selected.id,
        card.kind === "source" ? card.id : selected.id,
      );
    } else {
      const next =
        selected?.id === card.id && selected.kind === card.kind
          ? undefined
          : card;
      setSelected(next);
      setAnnouncement(
        next
          ? `${card.kind === "source" ? columnByKey.get(card.id)?.header : fields.find((f) => f.id === card.id)?.header} selected. Select its counterpart, or press Escape to cancel.`
          : "Selection cancelled.",
      );
    }
  };
  const startDrag = (e: DragEvent, card: Card) => {
    drag.current = card;
    setDragging(card);
    setSelected(undefined);
    e.dataTransfer.effectAllowed = card.kind === "pair" ? "move" : "copy";
    e.dataTransfer.setData("text/plain", card.id);
  };
  const reorderPair = (id: string, destination: string) => {
    if (disabled) return;
    const reordered = [...matched];
    const from = reordered.findIndex((f) => f.id === id),
      to = reordered.findIndex((f) => f.id === destination);
    if (from < 0 || to < 0 || from === to) return;
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    let i = 0;
    change(fields.map((f) => (sourceKey(f) ? reordered[i++] : f)));
    setAnnouncement(
      "Pair reordered. Export order updated; unmatched output positions stayed fixed.",
    );
    clearDrag();
    focus(`grip-${id}`);
  };
  const move = (id: string, direction: number) => {
    if (disabled) return;
    const i = fields.findIndex((f) => f.id === id),
      j = i + direction;
    if (i < 0 || j < 0 || j >= fields.length) return;
    const reordered = [...fields];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    change(reordered);
    setAnnouncement(`${fields[i].header} moved to export position ${j + 1}.`);
  };
  const remove = (id: string) => {
    const i = fields.findIndex((f) => f.id === id),
      next = fields[i + 1] ?? fields[i - 1];
    change(fields.filter((f) => f.id !== id));
    setEditing(undefined);
    setSelected(undefined);
    setAnnouncement(`${fields[i].header || "Output column"} removed.`);
    if (next) focus(`output-${next.id}`);
    else requestAnimationFrame(() => addButton.current?.focus());
  };
  const closeSettings = () => {
    setEditing(undefined);
    if (editing) focus(`edit-${editing}`);
  };
  const cardEvents = (card: Card) => ({
    draggable: !disabled,
    onClick: () => select(card),
    onDragStart: (e: DragEvent) => startDrag(e, card),
    onDragEnd: clearDrag,
    onDragOver: (e: DragEvent) => {
      if (
        !disabled &&
        drag.current &&
        drag.current.kind !== "pair" &&
        drag.current.kind !== card.kind
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        setTarget(`${card.kind}-${card.id}`);
      }
    },
    onDragLeave: () => setTarget(undefined),
    onDrop: (e: DragEvent) => {
      const from = drag.current;
      if (
        !disabled &&
        from &&
        from.kind !== "pair" &&
        from.kind !== card.kind
      ) {
        e.preventDefault();
        e.stopPropagation();
        match(
          card.kind === "output" ? card.id : from.id,
          card.kind === "source" ? card.id : from.id,
        );
      }
    },
  });
  const cardClass = (kind: "source" | "output", id: string) =>
    `card ${kind === "output" ? "destination" : "source"} ${selected?.kind === kind && selected.id === id ? "selected" : ""} ${(dragging && dragging.kind !== kind && dragging.kind !== "pair") || (selected && selected.kind !== kind) ? "valid-target" : ""} ${target === `${kind}-${id}` ? "over" : ""}`;
  const sourceCard = (key: string, pairedField?: Field) => {
    const c = columnByKey.get(key),
      uses = pairedField ? 0 : (usesBySource.get(key) ?? 0);
    return (
      <button
        key={key}
        data-source-key={key}
        className={cardClass("source", key)}
        disabled={disabled}
        aria-label={
          pairedField
            ? `Select paired source ${c?.header ?? key} for ${pairedField.header}`
            : `Select source ${c?.header ?? key}`
        }
        aria-pressed={selected?.kind === "source" && selected.id === key}
        {...cardEvents({ kind: "source", id: key })}
      >
        <strong>{c?.header ?? key}</strong>
        <span className="sample">{sample(key)}</span>
        {!pairedField && uses > 0 && (
          <span className="used">
            Used in {uses} output{uses === 1 ? "" : "s"}
          </span>
        )}
        {!c && (
          <span className="error-text">
            Source missing — choose another source
          </span>
        )}
      </button>
    );
  };
  const outputCard = (f: Field, paired: boolean) => (
    <button
      ref={(node) => {
        if (node) cards.current.set(`output-${f.id}`, node);
        else cards.current.delete(`output-${f.id}`);
      }}
      className={cardClass("output", f.id)}
      disabled={disabled}
      aria-label={`Select output ${f.header || "unnamed column"}`}
      aria-pressed={selected?.kind === "output" && selected.id === f.id}
      {...cardEvents({ kind: "output", id: f.id })}
    >
      <strong>
        <span className="position">{positions.get(f)}</span>
        {f.header || "Name this output column"}
      </strong>
      <span className={paired ? "confirmed" : "waiting"}>
        {paired
          ? `Confirmed · copies ${columnByKey.get(sourceKey(f))?.header ?? sourceKey(f)}`
          : "Unmatched · drop a source here"}
      </span>
    </button>
  );
  const editButton = (f: Field) => (
    <button
      className="edit"
      disabled={disabled}
      aria-label={`Edit ${f.header || "output column"}`}
      ref={(node) => {
        if (node) cards.current.set(`edit-${f.id}`, node);
        else cards.current.delete(`edit-${f.id}`);
      }}
      onClick={() => setEditing(f.id)}
      title="Column settings"
    >
      ⋯
    </button>
  );
  return (
    <section
      className="panel matching"
      aria-labelledby="map-title"
      onKeyDown={(e) => {
        if (
          e.key === "Escape" &&
          !settings.current?.open &&
          !order.current?.open
        ) {
          setSelected(undefined);
          clearDrag();
          setAnnouncement("Selection cancelled.");
        }
      }}
    >
      <div className="matching-heading">
        <div>
          <h2 id="map-title">2. Match your columns</h2>
          <p>
            Drag either card onto its counterpart, or select one and then the
            other.
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
              setEditing(added[0].id);
            }}
          >
            + Add output column
          </button>
          <button
            disabled={disabled || !fields.length}
            onClick={() => setOrderOpen(true)}
          >
            Output order
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
              setSelected(undefined);
            }}
          >
            Replace output columns
          </button>{" "}
          <button onClick={() => setTemplate(undefined)}>
            Keep current columns
          </button>
        </div>
      )}
      <div className="group matched-group">
        <div className="section-title">
          <h3>
            Matched columns <span className="count">{matched.length}</span>
          </h3>
          <span className="section-note">
            Drag the grip to reorder a pair · Alt+↑ / Alt+↓
          </span>
        </div>
        <div className="matched-headings" aria-hidden="true">
          <span>Source column</span>
          <span>Output column · export position</span>
        </div>
        <div
          className="matched-scroll"
          role="region"
          aria-label="Matched columns"
          tabIndex={0}
        >
          {!matched.length && (
            <p className="empty-columns">
              Your matched pairs will appear here.
            </p>
          )}
          {matched.map((f, i) => (
            <div
              key={f.id}
              className={`pair ${target === `pair-${f.id}` ? "reorder-over" : ""}`}
              data-field-id={f.id}
              onDragOver={(e) => {
                if (!disabled && drag.current?.kind === "pair") {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setTarget(`pair-${f.id}`);
                }
              }}
              onDragLeave={() => setTarget(undefined)}
              onDrop={(e) => {
                if (drag.current?.kind === "pair") {
                  e.preventDefault();
                  reorderPair(drag.current.id, f.id);
                }
              }}
            >
              <button
                className="handle"
                disabled={disabled}
                draggable={!disabled}
                aria-label={`Reorder pair ${f.header}`}
                title="Drag pair or use Alt+Up/Down"
                ref={(node) => {
                  if (node) cards.current.set(`grip-${f.id}`, node);
                  else cards.current.delete(`grip-${f.id}`);
                }}
                onDragStart={(e) => startDrag(e, { kind: "pair", id: f.id })}
                onDragEnd={clearDrag}
                onKeyDown={(e) => {
                  if (
                    e.altKey &&
                    (e.key === "ArrowUp" || e.key === "ArrowDown")
                  ) {
                    e.preventDefault();
                    const next = matched[i + (e.key === "ArrowUp" ? -1 : 1)];
                    if (next) reorderPair(f.id, next.id);
                  }
                }}
              >
                ⠿
              </button>
              {sourceCard(sourceKey(f), f)}
              <span className="pair-mark" aria-hidden="true">
                ↔
              </span>
              {outputCard(f, true)}
              <div className="pair-actions">
                <button
                  className="unlink"
                  disabled={disabled}
                  aria-label={`Unlink ${f.header}`}
                  title="Unlink match"
                  onClick={() => {
                    update(f.id, { recipe: undefined });
                    setSelected(undefined);
                    setAnnouncement(
                      `${f.header} is unmatched. Export order unchanged.`,
                    );
                    focus(`output-${f.id}`);
                  }}
                >
                  ×
                </button>
                {editButton(f)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="group unmatched-group">
        <div className="section-title">
          <h3>
            Still to match <span className="count">{unmatched.length}</span>
          </h3>
          <span className="section-note">
            Sources remain available for reuse
          </span>
        </div>
        <div className="unmatched-grid">
          <div>
            <div className="lane-top">
              <h3>Available sources</h3>
              <small>{view.columns.length} columns</small>
            </div>
            <label className="sr-only" htmlFor="source-search">
              Search source columns
            </label>
            <input
              id="source-search"
              type="search"
              className="search"
              placeholder="Search source columns…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div
              className="source-grid"
              role="region"
              aria-label="Available source columns"
              tabIndex={0}
            >
              {columns.map((c) => sourceCard(c.key))}
              {!columns.length && (
                <p className="empty-columns">
                  No source columns match this search.
                </p>
              )}
            </div>
          </div>
          <div>
            <div className="lane-top">
              <h3>Unmatched outputs</h3>
              <small>Drop a source here</small>
            </div>
            <p className="helper">Or drag an output onto any source card.</p>
            <div
              className="dest-list"
              role="region"
              aria-label="Unmatched output columns"
              tabIndex={0}
            >
              {unmatched.map((f) => (
                <div key={f.id} className="dest-wrap" data-field-id={f.id}>
                  {outputCard(f, false)}
                  {editButton(f)}
                </div>
              ))}
              {!unmatched.length && (
                <p className="empty-columns">
                  {fields.length
                    ? "All outputs matched."
                    : "Import a header template or add the columns your import needs."}
                </p>
              )}
            </div>
          </div>
        </div>
        <details className="bulk-columns">
          <summary>Add several columns</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !disabled &&
                manualHeaders.length &&
                fields.length + manualHeaders.length <= 200
              ) {
                change([...fields, ...makeFields(manualHeaders)]);
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
      <p className="mapping-status" role="status" aria-live="polite">
        {announcement ||
          `${matched.length} of ${fields.length} outputs matched. No matches are guessed.`}
      </p>
      <div className="order-bar">
        <strong>Export order</strong>
        <div className="order-overflow">
          {fields.map((f, i) => (
            <span
              key={f.id}
              className={`order-chip ${sourceKey(f) ? "" : "missing"}`}
            >
              {i + 1} · {f.header || "Unnamed"}
            </span>
          ))}
        </div>
      </div>
      <dialog
        ref={settings}
        className="column-dialog"
        aria-labelledby="column-title"
        onCancel={closeSettings}
      >
        <h2 id="column-title">
          {field?.header || "New output column"} — column settings
        </h2>
        {field && (
          <>
            <fieldset disabled={disabled}>
              <label>
                Output column name
                <input
                  autoFocus
                  value={field.header}
                  onChange={(e) => update(field.id, { header: e.target.value })}
                />
              </label>
              <label>
                Copy source for {field.header || "unnamed column"}
                <select
                  aria-label={`Copy source for ${field.header || "unnamed column"}`}
                  value={sourceKey(field)}
                  onChange={(e) => {
                    if (e.target.value) match(field.id, e.target.value);
                    else {
                      update(field.id, { recipe: undefined });
                      setAnnouncement(`${field.header} is unmatched.`);
                    }
                  }}
                >
                  <option value="">Unmatched — choose a source</option>
                  {view.columns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.header}
                    </option>
                  ))}
                </select>
              </label>
              <p className="helper">
                Changes update preview automatically. Text copied exactly · no
                trimming or conversion.
              </p>
              <details className="column-validation">
                <summary>Validation (optional)</summary>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      update(field.id, { required: e.target.checked })
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
                    value={field.maxLength ?? ""}
                    onChange={(e) =>
                      update(field.id, {
                        maxLength:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                  />
                </label>
              </details>
              <div className="dialog-actions">
                <button
                  disabled={disabled || fields[0]?.id === field.id}
                  aria-label={`Move ${field.header} up`}
                  onClick={() => move(field.id, -1)}
                >
                  Move output up
                </button>
                <button
                  disabled={disabled || fields.at(-1)?.id === field.id}
                  aria-label={`Move ${field.header} down`}
                  onClick={() => move(field.id, 1)}
                >
                  Move output down
                </button>
                <button
                  aria-label={`Remove ${field.header}`}
                  onClick={() => remove(field.id)}
                >
                  Remove output
                </button>
              </div>
            </fieldset>
            <button onClick={closeSettings}>Done</button>
          </>
        )}
      </dialog>
      <dialog
        ref={order}
        className="column-dialog"
        aria-labelledby="order-title"
        onCancel={() => setOrderOpen(false)}
      >
        <h2 id="order-title">Destination export order</h2>
        <p className="helper">
          All output columns, including unmatched ones. Moving a column
          deliberately changes export order.
        </p>
        <ol className="order-list">
          {fields.map((f, i) => (
            <li key={f.id}>
              <span>
                {i + 1} · {f.header || "Unnamed"}
              </span>
              <button
                disabled={disabled || i === 0}
                aria-label={`Move ${f.header} up`}
                onClick={() => move(f.id, -1)}
              >
                ↑
              </button>
              <button
                disabled={disabled || i === fields.length - 1}
                aria-label={`Move ${f.header} down`}
                onClick={() => move(f.id, 1)}
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
        <button onClick={() => setOrderOpen(false)}>Done</button>
      </dialog>
    </section>
  );
}
