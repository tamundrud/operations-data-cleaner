import {
  workflowSchema,
  normalizeHeader,
  referencedHeaders,
  type Workflow,
} from "./workflow";
import type { SourceTable } from "./values";
import type { Issue } from "./issues";
export function validateWorkflow(
  workflow: Workflow,
  source: SourceTable,
): Issue[] {
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
    workflow.output.format !== "csv" ||
    workflow.output.delimiter !== "," ||
    workflow.output.bom ||
    !workflow.output.header
  )
    add(
      "unsupported-format",
      "This U2 build supports CSV with default export settings only.",
      "Use UTF-8, comma, headers, no BOM and CRLF.",
    );
  const keys = new Set(source.columns.map((c) => c.key));
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
    if (f.recipe && f.recipe.kind !== "copy")
      add(
        "unsupported-recipe",
        `${f.recipe.kind} is not supported in this U2 build.`,
        "Use a copy mapping.",
        f.id,
      );
    if (
      f.type !== "text" ||
      f.trim ||
      f.date ||
      f.rounding ||
      f.scale !== undefined ||
      f.wholeNumber !== undefined
    )
      add(
        "unsupported-settings",
        "This U2 build copies text without conversion or trimming.",
        "Use text with optional required/max-length validation.",
        f.id,
      );
    const r = f.recipe;
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
  for (const ref of referencedHeaders(workflow.fields))
    if (!keys.has(ref))
      add(
        "missing-header",
        `Referenced source header “${ref}” is missing.`,
        "Choose an available source column or correct and reupload the CSV.",
      );
  return errors;
}
