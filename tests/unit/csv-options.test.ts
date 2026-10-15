import { expect, test } from "vitest";
import { makeWorkflow } from "../../src/engine/workflow";
import { evaluate } from "../../src/engine/recipes";
import { parseCsv, serializeCsv } from "../../src/formats/csv";
for (const delimiter of [",", ";", "\t"] as const)
  for (const bom of [false, true])
    for (const header of [false, true])
      test(`exact CSV bytes delimiter=${JSON.stringify(delimiter)} BOM=${bom} header=${header}`, () => {
        const w = makeWorkflow(['All,";\t', "Code", "Empty"]);
        w.output = { ...w.output, delimiter, bom, header };
        w.fields[0].recipe = { kind: "constant", value: { kind: "text", text: 'café,;\t"Dock"\nNorth\r\nSouth' } };
        w.fields[1].recipe = { kind: "constant", value: { kind: "text", text: "0012" } };
        w.fields[2].recipe = { kind: "constant", value: { kind: "blank" } };
        const source = parseCsv(new TextEncoder().encode("ID\na\nb"), ",", "csv");
        const row = `"café,;\t""Dock""\nNorth\r\nSouth"${delimiter}0012${delimiter}\r\n`;
        const expected = (bom ? "\ufeff" : "") + (header ? `"All,"";\t"${delimiter}Code${delimiter}Empty\r\n` : "") + row + row;
        expect(serializeCsv(w, evaluate(w, source), undefined)).toEqual(new TextEncoder().encode(expected));
      });
test("omitted headers do not contribute formula risk", () => {
  const w = makeWorkflow(["=Not exported"]);
  w.fields[0].recipe = { kind: "constant", value: { kind: "text", text: "0012" } };
  w.output.header = false;
  const run = evaluate(w, parseCsv(new TextEncoder().encode("ID\na"), ",", "d"));
  expect(run.riskyHeaders).toEqual([]);
  expect(serializeCsv(w, run, undefined)).toEqual(new TextEncoder().encode("0012\r\n"));
});
