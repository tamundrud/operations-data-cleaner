import { decodeWorkflow, referencedHeaders, type Field, type Workflow } from "../engine/workflow";
import { validateWorkflowConfiguration } from "../engine/validation";

function requireUsable(workflow: Workflow): Workflow {
  const issues = validateWorkflowConfiguration(workflow);
  if (issues.length) {
    const unsupported = issues.some((issue) => issue.code.startsWith("unsupported-"));
    throw new Error(unsupported
      ? "Unsupported workflow capability. Use CSV, copies, fixed values, splits and combinations with delivered settings."
      : "Workflow configuration is invalid. Complete mappings and correct output names, identities and field settings.");
  }
  return workflow;
}

/** Strict boundary for untrusted portable and stored configuration. */
export function decodeUsableWorkflow(json: string): Workflow {
  const workflow = requireUsable(decodeWorkflow(json));
  const expected = new Set(referencedHeaders(workflow.fields));
  const declared = workflow.source.referencedHeaders;
  if (declared.length !== expected.size || declared.some((ref) => !expected.has(ref)) || new Set(declared).size !== declared.length)
    throw new Error("Workflow configuration reference set is inconsistent. Declare exactly the unique source headers used by recipes.");
  return workflow;
}

function projectRecipe(recipe: Field["recipe"]): Field["recipe"] {
  if (recipe?.kind === "copy") return { kind: "copy", source: recipe.source };
  if (recipe?.kind === "constant") {
    const value = recipe.value;
    if (value.kind === "text") return { kind: "constant", value: { kind: "text", text: value.text } };
    if (value.kind === "number") return { kind: "constant", value: { kind: "number", decimal: value.decimal } };
    if (value.kind === "blank") return { kind: "constant", value: { kind: "blank" } };
  }
  if (recipe?.kind === "split") return {
    kind: "split", source: recipe.source, delimiter: recipe.delimiter,
    segments: recipe.segments, index: recipe.index, trim: recipe.trim,
    optionalEmpty: [...recipe.optionalEmpty],
  };
  if (recipe?.kind === "combine") return {
    kind: "combine", separator: recipe.separator,
    components: recipe.components.map((c) => c.kind === "source"
      ? { kind: "source", source: c.source }
      : { kind: "literal", text: c.text }),
  };
  // Leave unsupported/malformed variants for the shared validators to reject.
  return recipe;
}

/** An independent configuration-only editor snapshot; no source data is consulted. */
export function snapshotWorkflow(workflow: Workflow): Workflow {
  const projection = {
    version: workflow.version,
    id: workflow.id,
    ...(workflow.name !== undefined ? { name: workflow.name } : {}),
    source: {
      format: workflow.source.format,
      delimiter: workflow.source.delimiter,
      referencedHeaders: referencedHeaders(workflow.fields),
    },
    fields: workflow.fields.map((field) => ({
      id: field.id,
      header: field.header,
      type: field.type,
      required: field.required,
      ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}),
      ...(field.wholeNumber !== undefined ? { wholeNumber: field.wholeNumber } : {}),
      ...(field.scale !== undefined ? { scale: field.scale } : {}),
      ...(field.trim !== undefined ? { trim: field.trim } : {}),
      ...(field.date !== undefined ? { date: { source: field.date.source, target: field.date.target } } : {}),
      ...(field.rounding !== undefined ? { rounding: { mode: field.rounding.mode, places: field.rounding.places } } : {}),
      ...(field.recipe !== undefined ? { recipe: projectRecipe(field.recipe) } : {}),
    })),
    output: {
      format: workflow.output.format,
      delimiter: workflow.output.delimiter,
      bom: workflow.output.bom,
      header: workflow.output.header,
      lineEnding: workflow.output.lineEnding,
      dateSystem: workflow.output.dateSystem,
    },
  };
  // Reuse the bounded structural decoder, including the encoded UTF-8 byte budget.
  return decodeUsableWorkflow(JSON.stringify(projection));
}

export function encodeWorkflow(workflow: Workflow): string {
  const json = JSON.stringify(snapshotWorkflow(workflow), null, 2);
  decodeUsableWorkflow(json);
  return json;
}
