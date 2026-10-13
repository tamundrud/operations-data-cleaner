import type { Workflow } from "./workflow";
import type { SourceTable, Value } from "./values";
import type { Issue } from "./issues";
import { validateWorkflow } from "./validation";
import { riskyText } from "../formats/spreadsheet-safety";
export type ResultRow = {
  id: string;
  record: number;
  line: number;
  values: Value[];
  provenance: { field: string; source: string; row: string }[];
  issues: Issue[];
  status: "valid" | "warning" | "invalid";
};
export type Run = {
  workflowIssues: Issue[];
  rows: ResultRow[];
  summary: {
    inputRows: number;
    skippedBlanks: number;
    candidates: number;
    valid: number;
    warningOnly: number;
    invalid: number;
    warningIssues: number;
    errorIssues: number;
    corrected: number;
    excluded: number;
  };
  riskyHeaders: string[];
};
export function evaluate(workflow: Workflow, source: SourceTable): Run {
  const workflowIssues = validateWorkflow(workflow, source);
  const run: Run = {
    workflowIssues,
    rows: [],
    summary: {
      inputRows: source.inputRows,
      skippedBlanks: source.skippedBlanks,
      candidates: source.rows.length,
      valid: 0,
      warningOnly: 0,
      invalid: 0,
      warningIssues: 0,
      errorIssues: 0,
      corrected: 0,
      excluded: 0,
    },
    riskyHeaders: workflow.fields
      .filter((f) => riskyText(f.header))
      .map((f) => f.header),
  };
  if (workflowIssues.length) return run;
  const positions = new Map(source.columns.map((c) => [c.key, c.position]));
  for (const row of source.rows) {
    const issues: Issue[] = [],
      provenance: ResultRow["provenance"] = [];
    const values: Value[] = workflow.fields.map((f) => {
      if (f.recipe?.kind !== "copy") throw new Error("Unvalidated recipe");
      const sourceKey = f.recipe.source;
      const text = row.cells[positions.get(sourceKey)!]?.raw ?? "";
      provenance.push({ field: f.id, source: sourceKey, row: row.id });
      const add = (
        code: string,
        severity: "error" | "warning",
        reason: string,
        action: string,
      ) =>
        issues.push({
          code,
          scope: "row",
          severity,
          row: row.id,
          record: row.record,
          line: row.line,
          field: f.id,
          source: sourceKey,
          reason,
          action,
        });
      if (f.required && text.trim() === "")
        add(
          "required",
          "error",
          `${f.header} is required but blank.`,
          "Correct the source file and reupload, or change the field rule.",
        );
      if (f.maxLength && [...text].length > f.maxLength)
        add(
          "max-length",
          "error",
          `${f.header} exceeds ${f.maxLength} characters.`,
          "Correct the source file or increase the maximum length.",
        );
      if (riskyText(text))
        add(
          "csv-risk",
          "warning",
          `${f.header} may be interpreted as a spreadsheet formula.`,
          "Choose escaped output or raw TMS text before download.",
        );
      return text === "" ? { kind: "blank" } : { kind: "text", text };
    });
    const status = issues.some((i) => i.severity === "error")
      ? "invalid"
      : issues.length
        ? "warning"
        : "valid";
    run.summary[status === "warning" ? "warningOnly" : status]++;
    run.summary.warningIssues += issues.filter(
      (i) => i.severity === "warning",
    ).length;
    run.summary.errorIssues += issues.filter(
      (i) => i.severity === "error",
    ).length;
    run.rows.push({
      id: row.id,
      record: row.record,
      line: row.line,
      values,
      provenance,
      issues,
      status,
    });
  }
  return run;
}
