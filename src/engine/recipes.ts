import type { Workflow } from "./workflow";
import { displayValue, type SourceTable, type Value } from "./values";
import type { Issue } from "./issues";
import { validateWorkflow } from "./validation";
import { riskyText } from "../formats/spreadsheet-safety";
export type ResultRow = {
  id: string;
  record: number;
  line: number;
  values: Value[];
  provenance: ({ field: string; row: string; trim?: true } &
    ({ source: string } | { constant: Value }))[];
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
      .filter((f) => workflow.output.header && riskyText(f.header))
      .map((f) => f.header),
  };
  if (workflowIssues.length) return run;
  const positions = new Map(source.columns.map((c) => [c.key, c.position]));
  for (const row of source.rows) {
    const issues: Issue[] = [],
      provenance: ResultRow["provenance"] = [];
    const values: Value[] = workflow.fields.map((f) => {
      const recipe = f.recipe;
      if (!recipe || (recipe.kind !== "copy" && recipe.kind !== "constant"))
        throw new Error("Unvalidated recipe");
      const sourceKey = recipe.kind === "copy" ? recipe.source : undefined;
      let value: Value = recipe.kind === "constant"
        ? { ...recipe.value }
        : { kind: "text", text: row.cells[positions.get(recipe.source)!]?.raw ?? "" };
      provenance.push({
        field: f.id,
        row: row.id,
        ...(recipe.kind === "copy" ? { source: recipe.source } : { constant: { ...recipe.value } }),
        ...(f.trim ? { trim: true as const } : {}),
      });
      if (f.trim && value.kind === "text") value = { kind: "text", text: value.text.trim() };
      const text = displayValue(value);
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
      if (value.kind === "text" && riskyText(text))
        add(
          "csv-risk",
          "warning",
          `${f.header} may be interpreted as a spreadsheet formula.`,
          "Choose escaped output or raw TMS text before download.",
        );
      return value.kind === "text" && text === "" ? { kind: "blank" } : value;
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
