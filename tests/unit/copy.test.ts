import { expect, test } from "vitest";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
import { evaluate } from "../../src/engine/recipes";
import { makeWorkflow } from "../../src/engine/workflow";
test("copy preserves identifiers, whitespace and quoting in exact output bytes", () => {
  const source = parseCsv(
    new TextEncoder().encode('ID,Name\r\n001234," ACME, ""North""\nDock "\r\n'),
    ",",
    "d1",
  );
  const workflow = makeWorkflow(["Customer", "Reference"]);
  workflow.fields[0].recipe = { kind: "copy", source: "name" };
  workflow.fields[1].recipe = { kind: "copy", source: "id" };
  const run = evaluate(workflow, source);
  expect(run.summary.candidates).toBe(1);
  expect(
    run.rows[0].values.map((v) => (v.kind === "text" ? v.text : "")),
  ).toEqual([' ACME, "North"\nDock ', "001234"]);
  expect(new TextDecoder().decode(serializeCsv(workflow, run, undefined))).toBe(
    'Customer,Reference\r\n" ACME, ""North""\nDock ",001234\r\n',
  );
  expect(source.rows[0].line).toBe(2);
});
