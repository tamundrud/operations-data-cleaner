import { useState } from "react";
import type { SourceCell } from "../engine/values";
import ExcelCellDetails from "./ExcelCellDetails";
export default function SourceCorrection({ cell, header, record, disabled, onSave, onRevert }: {
  cell: SourceCell; header: string; record: number; disabled: boolean;
  onSave: (value: string) => void; onRevert: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(cell.raw);
  const original = cell.original ?? cell;
  return <div>
    <span>{cell.display || "(blank)"}</span>
    {cell.original && <p>Corrected in this session · Original: {original.display || "(blank)"}</p>}
    {original.excel && <ExcelCellDetails cell={original.excel} />}
    {editing ? <form onSubmit={e => { e.preventDefault(); onSave(value); setEditing(false); }}>
      <label>Replacement for {header}, record {record}<textarea aria-label={`Replacement for ${header}, record ${record}`} value={value} onChange={e => setValue(e.target.value)} disabled={disabled} /></label>
      <p>Literal text replacement. Numeric rules still apply. For Excel date rules, enter YYYY-MM-DD.</p>
      <button disabled={disabled}>Apply correction</button>
      <button type="button" onClick={() => setEditing(false)}>Cancel edit</button>
    </form> : <button disabled={disabled} onClick={() => { setValue(cell.raw); setEditing(true); }}>Correct {header}, record {record}</button>}
    {cell.original && <button disabled={disabled} onClick={onRevert}>Revert {header}, record {record}</button>}
  </div>;
}
