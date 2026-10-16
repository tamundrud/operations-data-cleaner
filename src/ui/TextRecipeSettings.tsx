import { useState } from "react";
import type { Field } from "../engine/workflow";
import type { SourceColumn } from "../engine/values";

type Recipe = NonNullable<Field["recipe"]>;
type Props = { recipe: Extract<Recipe, { kind: "split" | "combine" }>; columns: SourceColumn[]; change: (recipe: Recipe) => void };

export default function TextRecipeSettings({ recipe, columns, change }: Props) {
  const [notice, setNotice] = useState("");
  const sources = columns.map((c) => <option key={c.key} value={c.key}>{c.header}</option>);
  if (recipe.kind === "split") return (
    <fieldset className="text-recipe">
      <legend>Split a source into segments</legend>
      <label>Split source
        <select aria-label="Split source" value={recipe.source} onChange={(e) => change({ ...recipe, source: e.target.value })}>
          <option value="">Choose a source</option>{sources}
        </select>
      </label>
      <label>Split delimiter
        <input maxLength={4096} value={recipe.delimiter} onChange={(e) => change({ ...recipe, delimiter: e.target.value })} />
      </label>
      <div className="recipe-grid">
        <label>Expected segment count
          <input type="number" min={1} max={100} value={recipe.segments} onChange={(e) => {
            const segments = Number(e.target.value);
            const optionalEmpty = Number.isInteger(segments) && segments >= 1 && segments <= 100
              ? recipe.optionalEmpty.filter((index) => index < segments)
              : recipe.optionalEmpty;
            setNotice(optionalEmpty.length < recipe.optionalEmpty.length
              ? "Optional empty positions beyond the new segment count were removed."
              : "");
            change({ ...recipe, segments, optionalEmpty });
          }} />
        </label>
        <label>Use segment number
          <input type="number" min={1} max={recipe.segments} value={recipe.index + 1} onChange={(e) => change({ ...recipe, index: Number(e.target.value) - 1 })} />
        </label>
      </div>
      <label className="check"><input type="checkbox" checked={recipe.trim} onChange={(e) => change({ ...recipe, trim: e.target.checked })} />Trim whitespace around each segment</label>
      <fieldset className="optional-segments">
        <legend>Allow empty positions (optional)</legend>
        {Array.from({ length: Math.min(100, Math.max(0, recipe.segments)) }, (_, index) => (
          <label className="check" key={index}>
            <input type="checkbox" checked={recipe.optionalEmpty.includes(index)} onChange={(e) => change({ ...recipe, optionalEmpty: e.target.checked ? [...recipe.optionalEmpty, index] : recipe.optionalEmpty.filter((i) => i !== index) })} />
            Segment {index + 1} may be empty
          </label>
        ))}
      </fieldset>
      <p role="status">{notice}</p>
      <p className="helper">The count must match exactly. Keep delimiters for empty positions, such as a,,c,d. All other positions must contain text. Each output reads the original source independently.</p>
    </fieldset>
  );
  const update = (index: number, component: typeof recipe.components[number]) =>
    change({ ...recipe, components: recipe.components.map((c, i) => i === index ? component : c) });
  const move = (index: number, direction: number) => {
    const components = [...recipe.components];
    const next = index + direction;
    [components[index], components[next]] = [components[next], components[index]];
    change({ ...recipe, components });
  };
  return (
    <fieldset className="text-recipe">
      <legend>Combine in this order</legend>
      <label>Combination separator
        <input maxLength={4096} value={recipe.separator} onChange={(e) => change({ ...recipe, separator: e.target.value })} />
      </label>
      <ol className="component-list">
        {recipe.components.map((component, index) => (
          <li key={index}>
            <fieldset>
              <legend>Component {index + 1}</legend>
              <label>Component {index + 1} type
                <select aria-label={`Component ${index + 1} type`} value={component.kind} onChange={(e) => update(index, e.target.value === "source" ? { kind: "source", source: "" } : { kind: "literal", text: "" })}>
                  <option value="source">Source column</option><option value="literal">Literal text</option>
                </select>
              </label>
              {component.kind === "source" ? <label>Component {index + 1} source
                <select aria-label={`Component ${index + 1} source`} value={component.source} onChange={(e) => update(index, { kind: "source", source: e.target.value })}>
                  <option value="">Choose a source</option>{sources}
                </select>
              </label> : <label>Component {index + 1} text
                <textarea aria-label={`Component ${index + 1} text`} rows={2} maxLength={4096} value={component.text} onChange={(e) => update(index, { kind: "literal", text: e.target.value })} />
              </label>}
              <div className="component-actions">
                <button disabled={index === 0} aria-label={`Move component ${index + 1} up`} onClick={() => move(index, -1)}>↑ Up</button>
                <button disabled={index === recipe.components.length - 1} aria-label={`Move component ${index + 1} down`} onClick={() => move(index, 1)}>↓ Down</button>
                <button disabled={recipe.components.length <= 2} aria-label={`Remove component ${index + 1}`} onClick={() => change({ ...recipe, components: recipe.components.filter((_, i) => i !== index) })}>Remove</button>
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <button disabled={recipe.components.length >= 100} onClick={() => change({ ...recipe, components: [...recipe.components, { kind: "source", source: "" }] })}>Add source component</button>{" "}
      <button disabled={recipe.components.length >= 100} onClick={() => change({ ...recipe, components: [...recipe.components, { kind: "literal", text: "" }] })}>Add literal component</button>
      <p className="helper">At least two components. Empty sources and empty literals keep their position and separator. Text and spacing stay exact unless output trimming is enabled.</p>
    </fieldset>
  );
}
