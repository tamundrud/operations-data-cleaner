import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { decodeWorkflow } from "../../src/engine/workflow";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
import { evaluate } from "../../src/engine/recipes";
test("bundled synthetic configuration produces committed golden bytes", () => {
  const w = decodeWorkflow(readFileSync("examples/u2/workflow.json", "utf8"));
  const r = evaluate(
    w,
    parseCsv(readFileSync("examples/u2/source.csv"), ",", "sample"),
  );
  expect(Buffer.from(serializeCsv(w, r, undefined))).toEqual(
    readFileSync("examples/u2/expected.csv"),
  );
});
test("U3 synthetic fixed/trimmed semicolon BOM data-only example produces golden bytes", () => {
  const w = decodeWorkflow(readFileSync("examples/u3-workflow.json", "utf8"));
  const r = evaluate(w, parseCsv(readFileSync("examples/u3-source.csv"), ",", "u3-sample"));
  expect(r.workflowIssues).toEqual([]);
  expect(r.summary).toMatchObject({ candidates: 2, valid: 2, invalid: 0 });
  expect(Buffer.from(serializeCsv(w, r, undefined))).toEqual(readFileSync("examples/u3-expected.csv"));
});
