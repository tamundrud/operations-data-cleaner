import { expect, test } from "vitest";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
import { evaluate } from "../../src/engine/recipes";
import { makeWorkflow } from "../../src/engine/workflow";
test("all candidates, totals and blanks counted independently of preview size", () => {
  const t = parseCsv(
    new TextEncoder().encode(
      "ID,Name\n" +
        Array.from(
          { length: 10 },
          (_, i) => `${String(i).padStart(6, "0")},Site`,
        ).join("\n") +
        "\n,\n\n,TOTAL\n",
    ),
    ",",
    "d",
  );
  const w = makeWorkflow(["Reference"]);
  w.fields[0].recipe = { kind: "copy", source: "id" };
  w.fields[0].required = true;
  const r = evaluate(w, t);
  expect(r.summary).toMatchObject({
    inputRows: 13,
    skippedBlanks: 2,
    candidates: 11,
    valid: 10,
    invalid: 1,
    excluded: 0,
  });
  expect(r.rows[10].issues[0]).toMatchObject({
    code: "required",
    record: 14,
    line: 14,
  });
  expect(() => serializeCsv(w, r, undefined)).toThrow(/Export blocked/);
});
test("deterministic generated datasets retain full counts, row provenance and independent recipes", () => {
  for (let n = 1; n <= 150; n += 17) {
    const t = parseCsv(
      new TextEncoder().encode(
        "ID,Unused\n" +
          Array.from(
            { length: n },
            (_, i) => `${String(i).padStart(6, "0")},x`,
          ).join("\n"),
      ),
      ",",
      "d",
    );
    const w = makeWorkflow(["A", "B"]);
    w.fields.forEach((f) => (f.recipe = { kind: "copy", source: "id" }));
    const r = evaluate(w, t);
    expect(r).toEqual(evaluate(w, t));
    expect(r.summary.valid).toBe(n);
    expect(r.rows.at(-1)?.values).toEqual([
      { kind: "text", text: String(n - 1).padStart(6, "0") },
      { kind: "text", text: String(n - 1).padStart(6, "0") },
    ]);
    expect(r.rows[0].provenance).toEqual([
      { field: "field-0", source: "id", row: "d:2" },
      { field: "field-1", source: "id", row: "d:2" },
    ]);
  }
});
