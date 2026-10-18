import {
  workflowSchema,
  normalizeHeader,
  referencedHeaders,
  type Workflow,
} from "./workflow";
import type { SourceTable } from "./values";
import type { Issue } from "./issues";
export function validateWorkflowConfiguration(workflow: Workflow): Issue[] {
  const errors: Issue[] = [];
  const add = (code: string, reason: string, action: string, field?: string) =>
    errors.push({
      code,
      scope: "workflow",
      severity: "error",
      field,
      reason,
      action,
    });
  if (!workflowSchema.safeParse(workflow).success) {
    add(
      "schema",
      "Workflow structure is invalid.",
      "Use version 1 with valid field settings.",
    );
    return errors;
  }
  const ids = new Set<string>(),
    headers = new Set<string>();
  for (const f of workflow.fields) {
    const header = normalizeHeader(f.header);
    if (!header || headers.has(header) || ids.has(f.id))
      add(
        "destination-header",
        "Output names and field IDs must be unique and nonblank.",
        "Rename the output column.",
        f.id,
      );
    ids.add(f.id);
    headers.add(header);
    if (!f.recipe)
      add(
        "unmapped",
        `${f.header || "Output column"} is unmapped.`,
        "Choose a source column or remove this output column.",
        f.id,
      );
    if ((f.type === "date") !== (f.date !== undefined))
      add(
        "date-settings",
        "Date outputs require explicit source and output formats; date conversion requires a date output.",
        "Choose date output and both formats, or remove date settings.",
        f.id,
      );
    if (f.recipe?.kind === "calculate" && f.type !== "number")
      add(
        "calculation-type",
        "Calculations require a number output.",
        "Choose number output.",
        f.id,
      );
    if (
      (f.rounding || f.scale !== undefined || f.wholeNumber !== undefined) &&
      f.type !== "number"
    )
      add(
        "numeric-settings",
        "Numeric validation and rounding require a number output.",
        "Choose number output or remove numeric settings.",
        f.id,
      );
    if (f.rounding && f.scale !== undefined && f.rounding.places > f.scale)
      add(
        "numeric-settings",
        "Rounding decimal places exceed the maximum decimal places.",
        "Reduce rounding places or increase the maximum.",
        f.id,
      );
    const r = f.recipe;
    if (
      r?.kind === "constant" &&
      r.value.kind !== "blank" &&
      r.value.kind !== (f.type === "date" ? "text" : f.type)
    )
      add(
        "constant-type",
        "The fixed value type must match the output type.",
        "Use a text literal for text/date output or a number literal for number output.",
        f.id,
      );
    if (f.trim && f.type === "number")
      add(
        "trim-type",
        "Trimming requires a text or date output.",
        "Use text/date or turn off whitespace trimming.",
        f.id,
      );
    if (
      r?.kind === "split" &&
      (r.index >= r.segments ||
        r.optionalEmpty.some((i) => i >= r.segments) ||
        new Set(r.optionalEmpty).size !== r.optionalEmpty.length)
    )
      add(
        "split-index",
        "Split positions must be unique and within the expected segment count.",
        "Correct the segment positions.",
        f.id,
      );
    if (f.maxLength !== undefined && f.type !== "text")
      add(
        "validation-type",
        "Maximum length requires a text field.",
        "Use text or remove maximum length.",
        f.id,
      );
  }
  return errors;
}

export function validateWorkflow(
  workflow: Workflow,
  source: SourceTable,
): Issue[] {
  const errors = validateWorkflowConfiguration(workflow);
  if (errors.some((issue) => issue.code === "schema")) return errors;
  const keys = new Set(source.columns.map((c) => c.key));
  for (const ref of referencedHeaders(workflow.fields))
    if (!keys.has(ref))
      errors.push({
        code: "missing-header",
        scope: "workflow",
        severity: "error",
        reason: `Referenced source header “${ref}” is missing.`,
        action:
          "Choose an available source column or correct and reupload the CSV.",
      });
  return errors;
}
