import { expect, test } from "vitest";
import {
  decodeWorkflow,
  makeWorkflow,
  workflowSchema,
  referencedHeaders,
} from "../../src/engine/workflow";
import { parseCsv } from "../../src/formats/csv";
import { evaluate } from "../../src/engine/recipes";
const source = parseCsv(
  new TextEncoder().encode("ID,Extra\n001234,x"),
  ",",
  "d",
);
const copy = () => {
  const w = makeWorkflow(["Reference"]);
  w.fields[0].recipe = { kind: "copy", source: "id" };
  return w;
};
test("strict versioned schema rejects extra executable properties and unknown versions", () => {
  expect(decodeWorkflow(JSON.stringify(copy()))).toEqual(copy());
  expect(() =>
    decodeWorkflow(JSON.stringify({ ...copy(), version: 2 })),
  ).toThrow(/version/);
  expect(() =>
    decodeWorkflow(JSON.stringify({ ...copy(), script: "alert(1)" })),
  ).toThrow(/structure/);
  expect(() => decodeWorkflow("[".repeat(21) + "0" + "]".repeat(21))).toThrow(
    /nesting/,
  );
  expect(() => decodeWorkflow(" ".repeat(1024 * 1024 + 1))).toThrow(/1 MiB/);
});
test("complete finite grammar accepts valid later variants but never executes them in U2", () => {
  const variants = [
    { kind: "constant", value: { kind: "number", decimal: "0.10" } },
    { kind: "constant", value: { kind: "blank" } },
    {
      kind: "split",
      source: "id",
      delimiter: ",",
      segments: 2,
      index: 0,
      trim: false,
      optionalEmpty: [],
    },
    {
      kind: "combine",
      components: [
        { kind: "source", source: "id" },
        { kind: "literal", text: "x" },
      ],
      separator: " ",
    },
    {
      kind: "calculate",
      operation: "divide",
      left: { kind: "source", source: "id" },
      right: { kind: "number", decimal: "4" },
    },
  ];
  for (const recipe of variants) {
    const w = { ...copy(), fields: [{ ...copy().fields[0], recipe }] };
    expect(workflowSchema.safeParse(w).success).toBe(true);
    const decoded = decodeWorkflow(JSON.stringify(w));
    expect(
      evaluate(decoded, source).workflowIssues.some(
        (i) => i.code === "unsupported-recipe",
      ),
    ).toBe(true);
    expect(referencedHeaders(decoded.fields)).toEqual(
      recipe.kind === "constant" ? [] : ["id"],
    );
  }
});
test("unknown recipes, dependencies and malformed settings fail closed", () => {
  for (const recipe of [
    { kind: "script", code: "1" },
    { kind: "copy", output: "field-0" },
    { kind: "copy", source: "ID" },
  ])
    expect(
      workflowSchema.safeParse({
        ...copy(),
        fields: [{ ...copy().fields[0], recipe }],
      }).success,
    ).toBe(false);
  const w = copy();
  w.fields[0].maxLength = 0;
  expect(evaluate(w, source).workflowIssues[0].code).toBe("schema");
});
test("every included field needs a confirmed mapping and unique destination names", () => {
  expect(evaluate(makeWorkflow(["A"]), source).workflowIssues[0].code).toBe(
    "unmapped",
  );
  const w = copy();
  w.fields.push({ ...w.fields[0], id: "different", header: " reference " });
  expect(evaluate(w, source).workflowIssues[0].code).toBe("destination-header");
});
test("copy uses normalized header names across reordering, never guesses missing headers", () => {
  const w = copy();
  const t = parseCsv(
    new TextEncoder().encode("Extra, ID \nx,001234"),
    ",",
    "d",
  );
  expect(evaluate(w, t).rows[0].values[0]).toEqual({
    kind: "text",
    text: "001234",
  });
  w.fields[0].recipe = { kind: "copy", source: "identifier" };
  expect(evaluate(w, t).workflowIssues[0].code).toBe("missing-header");
});
test("required and max-length validate text without trimming or silently shortening it", () => {
  const w = copy();
  w.fields[0].required = true;
  w.fields[0].maxLength = 3;
  const t = parseCsv(
    new TextEncoder().encode("ID,Extra\n  ,x\n00007,x"),
    ",",
    "d",
  );
  const r = evaluate(w, t);
  expect(r.summary.invalid).toBe(2);
  expect(r.rows[0].values[0]).toEqual({ kind: "text", text: "  " });
  expect(r.rows[1].issues[0].code).toBe("max-length");
});
