import { expect, test } from "vitest";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
import { makeWorkflow } from "../../src/engine/workflow";
import { evaluate } from "../../src/engine/recipes";
import { riskyText } from "../../src/formats/spreadsheet-safety";
test.each(["=1+1", " +SUM(A1)", "-123", "@x", "\ttext", "\rtext", "\u0001 =1"])(
  "flags text %s",
  (s) => expect(riskyText(s)).toBe(true),
);
test.each(["001234", "normal", "x=y", "  text"])("does not flag text %s", (s) =>
  expect(riskyText(s)).toBe(false),
);
test("risk on headers and rows requires a per-run explicit choice, preserves exact raw logical text", () => {
  const w = makeWorkflow(["=Header"]);
  w.fields[0].recipe = { kind: "copy", source: "id" };
  const r = evaluate(
    w,
    parseCsv(new TextEncoder().encode("ID\n=1+1"), ",", "d"),
  );
  expect(r.summary).toMatchObject({
    warningOnly: 1,
    warningIssues: 1,
    invalid: 0,
  });
  expect(() => serializeCsv(w, r, undefined)).toThrow(/Choose/);
  expect(new TextDecoder().decode(serializeCsv(w, r, "raw"))).toBe(
    "=Header\r\n=1+1\r\n",
  );
  expect(new TextDecoder().decode(serializeCsv(w, r, "escape"))).toBe(
    "'=Header\r\n'=1+1\r\n",
  );
});
