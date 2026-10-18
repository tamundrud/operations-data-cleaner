import { useState } from "react";
import type { SourceCell } from "../engine/values";

export default function ExcelCellDetails({ cell }: { cell: NonNullable<SourceCell["excel"]> }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>Excel cell details</summary>
    {open && <dl>
      <dt>Type</dt><dd>{cell.type}</dd>
      <dt>Raw value</dt><dd>{String(cell.value ?? "(no cached value)")}</dd>
      <dt>Format</dt><dd>{cell.format}</dd>
      <dt>Workbook calendar</dt><dd>{cell.date1904 ? "1904" : "1900"}</dd>
      {cell.formula !== undefined && <><dt>Formula (never evaluated)</dt><dd>{cell.formula}</dd></>}
    </dl>}
  </details>;
}
