import { evaluate, countResult, type Run } from "../engine/recipes";
import type { Workflow } from "../engine/workflow";
import type { SourceRow, SourceTable } from "../engine/values";
export type Correction = { row: string; column: string; value: string };
export function correctedRows(source: SourceTable, edits: Correction[], rows: SourceRow[] = source.rows): SourceRow[] {
  const index = new Map<string, Map<string, string>>();
  for (const edit of edits) {
    if (!index.has(edit.row)) index.set(edit.row, new Map());
    index.get(edit.row)!.set(edit.column, edit.value);
  }
  return rows.map(row => {
    const replacements = index.get(row.id);
    if (!replacements) return row;
    return { ...row, cells: source.columns.map(({key, position}) => {
      const cell = row.cells[position] ?? { kind: "text" as const, raw: "", display: "" };
      if (!replacements.has(key)) return cell;
      const value = replacements.get(key)!;
      return { kind: "text", raw: value, display: value, original: cell };
    }) };
  });
}
export function correctedRun(workflow: Workflow, source: SourceTable, edits: Correction[], previous?: Run, changed?: string): Run {
  const rows = changed ? source.rows.filter(r => r.id === changed) : source.rows;
  const next = evaluate(workflow, { ...source, rows: correctedRows(source, edits, rows) });
  if (previous && changed && !next.workflowIssues.length) {
    next.rows = previous.rows.map(r => r.id === changed ? next.rows[0] : r);
    next.summary = { ...previous.summary, valid: 0, warningOnly: 0, invalid: 0, warningIssues: 0, errorIssues: 0 };
    next.csvRisk = false;
    for (const row of next.rows) countResult(next, row);
  }
  next.summary.candidates = source.rows.length;
  next.summary.corrected = new Set(edits.map(e => e.row)).size;
  return next;
}
