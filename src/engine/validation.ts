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
  if (
    workflow.source.format !== "csv" ||
    workflow.output.format !== "csv"
  )
    add(
      "unsupported-format",
      "This build supports CSV input and output only.",
      "Use UTF-8 CSV with comma, semicolon or tab and CRLF output.",
    );
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
    if (f.recipe && f.recipe.kind !== "copy" && f.recipe.kind !== "constant")
      add(
        "unsupported-recipe",
        `${f.recipe.kind} is not supported in this build.`,
        "Use a source copy or a fixed value.",
        f.id,
      );
    if (
      (f.type !== "text" && !(f.type === "number" && f.recipe?.kind === "constant")) ||
      f.date ||
      f.rounding ||
      f.scale !== undefined ||
      f.wholeNumber !== undefined
    )
      add(
        "unsupported-settings",
        "This build supports text copies and typed fixed values without conversion, dates or rounding.",
        "Use text or a fixed number, with supported validation settings.",
        f.id,
      );
    const r = f.recipe;
    if (r?.kind === "constant" && r.value.kind !== "blank" && r.value.kind !== f.type)
      add("constant-type", "The fixed value type must match the output type.", "Choose text for a text literal or number for a decimal literal.", f.id);
    if (f.trim && f.type !== "text")
      add("trim-type", "Trimming requires a text output.", "Use text or turn off whitespace trimming.", f.id);
    if (
      r?.kind === "split" &&
      (r.index >= r.segments || r.optionalEmpty.some((i) => i >= r.segments))
    )
      add(
        "split-index",
        "Split positions exceed the expected segment count.",
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

export function validateWorkflow(workflow: Workflow, source: SourceTable): Issue[] {
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
        action: "Choose an available source column or correct and reupload the CSV.",
      });
  return errors;
}
