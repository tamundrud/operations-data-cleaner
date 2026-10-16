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
  provenance: ({ field: string; row: string; trim?: true; segment?: number; segmentTrim?: boolean } &
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
      if (!recipe || recipe.kind === "calculate")
        throw new Error("Unvalidated recipe");
      const sourceKey = recipe.kind === "copy" || recipe.kind === "split" ? recipe.source : undefined;
      const add = (
        code: string,
        severity: "error" | "warning",
        reason: string,
        action: string,
      ) =>
        issues.push({
          code, scope: "row", severity,
          row: row.id, record: row.record, line: row.line,
          field: f.id, source: sourceKey, reason, action,
        });
      const readSource = (source: string) => {
        provenance.push({
          field: f.id, row: row.id, source,
          ...(f.trim ? { trim: true as const } : {}),
          ...(recipe.kind === "split" ? { segment: recipe.index, segmentTrim: recipe.trim } : {}),
        });
        return row.cells[positions.get(source)!]?.raw ?? "";
      };
      const readConstant = (constant: Value) => {
        provenance.push({ field: f.id, row: row.id, constant: { ...constant }, ...(f.trim ? { trim: true as const } : {}) });
        return { ...constant };
      };
      let value: Value;
      switch (recipe.kind) {
        case "copy":
          value = { kind: "text", text: readSource(recipe.source) };
          break;
        case "constant":
          value = readConstant(recipe.value);
          break;
        case "combine":
          value = { kind: "text", text: recipe.components.map((c) => c.kind === "source"
            ? readSource(c.source)
            : displayValue(readConstant({ kind: "text", text: c.text }))).join(recipe.separator) };
          break;
        case "split": {
          const parts = readSource(recipe.source).split(recipe.delimiter);
          value = { kind: "blank" };
          if (parts.length !== recipe.segments) {
            add("split-count", "error", `${f.header}: expected ${recipe.segments} segments but found ${parts.length}.`, "Correct the source delimiter positions or change the expected segment count.");
            break;
          }
          const segments = recipe.trim ? parts.map((part) => part.trim()) : parts;
          const empty = segments.flatMap((part, index) => part === "" && !recipe.optionalEmpty.includes(index) ? [index + 1] : []);
          if (empty.length) {
            add("split-empty", "error", `${f.header}: required segment ${empty.join(", ")} is empty.`, "Correct the source or explicitly mark that empty position optional; retain its delimiters.");
            break;
          }
          value = { kind: "text", text: segments[recipe.index] };
          break;
        }
      }
      if (f.trim && value.kind === "text") value = { kind: "text", text: value.text.trim() };
      const text = displayValue(value);
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
