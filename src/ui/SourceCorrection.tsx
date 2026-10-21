import { useEffect, useRef, useState } from "react";
import type { SourceCell } from "../engine/values";
import type { PendingCorrection } from "../session/correction-overlay";
import ExcelCellDetails from "./ExcelCellDetails";
export default function SourceCorrection({ cell, header, record, disabled, pending, target, navigation, onSave, onRevert }: {
  cell: SourceCell; header: string; record: number; disabled: boolean;
  pending?: PendingCorrection; target?: boolean;
  navigation: number;
  onSave: (value: string) => void; onRevert: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (target) {
      input.current?.focus({preventScroll:true});
      input.current?.scrollIntoView({block:"nearest",inline:"center"});
    }
  }, [target, navigation]);
  const original = cell.original ?? cell;
  return <div>
    <span>{cell.display || "(blank)"}</span>
    {cell.original && <p>Corrected in this session · Original: {original.display || "(blank)"}</p>}
    {original.excel && <ExcelCellDetails cell={original.excel} />}
    {pending && <p className="pending-marker">Pending change{pending.revert ? " · revert to original" : ""}</p>}
    {editing || pending || target ? <div>
      <label>Replacement for {header}, record {record}<textarea ref={input} aria-label={`Replacement for ${header}, record ${record}`} value={pending ? pending.revert ? original.raw : pending.value : cell.raw} onChange={e => onSave(e.target.value)} disabled={disabled} /></label>
      <p>Literal text replacement. Numeric rules still apply. For Excel date rules, enter YYYY-MM-DD.</p>
      <button type="button" disabled={disabled} onClick={() => { onSave(cell.raw); setEditing(false); }}>Cancel edit</button>
    </div> : <button disabled={disabled} onClick={() => setEditing(true)}>Correct {header}, record {record}</button>}
    {cell.original && <button disabled={disabled} onClick={onRevert}>Revert {header}, record {record}</button>}
  </div>;
}
