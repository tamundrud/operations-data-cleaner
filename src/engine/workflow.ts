import { z } from "zod";
export const normalizeHeader = (name: string) =>
  name.trim().replace(/\s+/gu, " ").toLowerCase();
const bounded = z.string().max(4096);
const key = bounded
  .min(1)
  .refine((v) => normalizeHeader(v) === v, "Use a normalized source header");
const decimal = z
  .string()
  .max(1000)
  .regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u);
const literal = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("text"), text: bounded }),
  z.strictObject({ kind: z.literal("number"), decimal }),
  z.strictObject({ kind: z.literal("blank") }),
]);
const component = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("source"), source: key }),
  z.strictObject({ kind: z.literal("literal"), text: bounded }),
]);
const operand = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("source"), source: key }),
  z.strictObject({ kind: z.literal("number"), decimal }),
]);
const recipe = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("copy"), source: key }),
  z.strictObject({ kind: z.literal("constant"), value: literal }),
  z.strictObject({
    kind: z.literal("split"),
    source: key,
    delimiter: bounded.min(1),
    segments: z.int().min(1).max(100),
    index: z.int().min(0).max(99),
    trim: z.boolean(),
    optionalEmpty: z.array(z.int().min(0).max(99)).max(100),
  }),
  z.strictObject({
    kind: z.literal("combine"),
    components: z.array(component).min(2).max(100),
    separator: bounded,
  }),
  z.strictObject({
    kind: z.literal("calculate"),
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    left: operand,
    right: operand,
  }),
]);
const pattern = z.enum(["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"]);
const field = z.strictObject({
  id: bounded.min(1),
  header: bounded.min(1),
  type: z.enum(["text", "number", "date"]),
  required: z.boolean(),
  maxLength: z.int().min(1).max(1000000).optional(),
  wholeNumber: z.boolean().optional(),
  scale: z.int().min(0).max(100).optional(),
  recipe: recipe.optional(),
  trim: z.boolean().optional(),
  date: z.strictObject({ source: pattern, target: pattern }).optional(),
  rounding: z
    .strictObject({
      mode: z.enum(["half-up", "half-even", "truncate"]),
      places: z.int().min(0).max(100),
    })
    .optional(),
});
export const workflowSchema = z.strictObject({
  version: z.literal(1),
  id: bounded.min(1),
  name: bounded.optional(),
  source: z.strictObject({
    format: z.enum(["csv", "xlsx"]),
    delimiter: z.enum(["auto", ",", ";", "\t"]),
    referencedHeaders: z.array(key).max(200),
  }),
  fields: z.array(field).min(1).max(200),
  output: z.strictObject({
    format: z.enum(["csv", "xlsx"]),
    delimiter: z.enum([",", ";", "\t"]),
    bom: z.boolean(),
    header: z.boolean(),
    lineEnding: z.literal("CRLF"),
    dateSystem: z.enum(["1900", "1904"]),
  }),
});
export type Workflow = z.infer<typeof workflowSchema>;
export type Field = Workflow["fields"][number];
export function makeWorkflow(headers: string[]): Workflow {
  return {
    version: 1,
    id: "draft",
    source: { format: "csv", delimiter: "auto", referencedHeaders: [] },
    fields: headers.map((header, i) => ({
      id: `field-${i}`,
      header,
      type: "text",
      required: false,
    })),
    output: {
      format: "csv",
      delimiter: ",",
      bom: false,
      header: true,
      lineEnding: "CRLF",
      dateSystem: "1900",
    },
  };
}
// One bounded codec shared by the bundled example and future configuration storage.
export function decodeWorkflow(json: string): Workflow {
  if (new TextEncoder().encode(json).length > 1024 * 1024)
    throw new Error("Workflow exceeds 1 MiB. Reduce its configuration.");
  let depth = 0,
    quoted = false,
    escaped = false;
  for (const c of json) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{" || c === "[") {
      if (++depth > 20)
        throw new Error(
          "Workflow nesting exceeds 20 levels. Use a supported configuration.",
        );
    } else if (c === "}" || c === "]") depth--;
  }
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error(
      "Workflow is not valid JSON. Use a valid version 1 configuration.",
    );
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version !== 1
  )
    throw new Error(
      "Unsupported workflow version. This build supports version 1.",
    );
  const parsed = workflowSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "Workflow structure is invalid. Use the strict version 1 fields and supported recipe settings.",
    );
  return parsed.data;
}
export function referencedHeaders(fields: Field[]): string[] {
  return [
    ...new Set(
      fields.flatMap((f) => {
        const r = f.recipe;
        if (!r || r.kind === "constant") return [];
        if (r.kind === "copy" || r.kind === "split") return [r.source];
        if (r.kind === "combine")
          return r.components.flatMap((c) =>
            c.kind === "source" ? [c.source] : [],
          );
        return [r.left, r.right].flatMap((o) =>
          o.kind === "source" ? [o.source] : [],
        );
      }),
    ),
  ];
}
