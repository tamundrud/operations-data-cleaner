import { expect, test } from "vitest";
import { evaluate } from "../../src/engine/recipes";
import { reviewIssues } from "../../src/engine/issues";
import { makeWorkflow } from "../../src/engine/workflow";
import { parseCsv } from "../../src/formats/csv";

const source = (csv: string) => parseCsv(new TextEncoder().encode(csv), ",", "causes");
test("four split outputs share one actionable cause while all diagnostics and invalidity remain", () => {
  const w = makeWorkflow(["Street", "City", "Province", "PostalCode"]);
  w.fields.forEach((f, index) => {
    f.required = true;
    f.recipe = { kind: "split", source: "address", delimiter: ",", segments: 4, index, trim: true, optionalEmpty: [] };
  });
  const run = evaluate(w, source('Address\n"Street,City,Province,Postal,Extra"'));
  expect(run.summary).toMatchObject({ invalid: 1, errorIssues: 8 });
  const items = reviewIssues(run.rows[0].issues);
  expect(items).toHaveLength(1);
  expect(items[0].fields).toEqual(w.fields.map(f => f.id));
  expect(items[0].sources).toEqual([{source: "address"}]);
  expect(items[0].issue.code).toBe("split-count");
  // Different split rules over the same cell must remain distinct.
  w.fields[1].recipe = { ...w.fields[1].recipe!, kind: "split", source: "address", delimiter: ",", segments: 3, index: 0, trim: true, optionalEmpty: [] };
  expect(reviewIssues(evaluate(w, source('Address\n"A,B,C,D,E"')).rows[0].issues)).toHaveLength(2);
});

test("arithmetic identifies every bad source operand and independent required blanks remain", () => {
  const w = makeWorkflow(["Cases", "Required"]);
  w.fields[0].type = "number"; w.fields[0].required = true;
  w.fields[0].recipe = { kind: "calculate", operation: "divide", left: {kind:"source",source:"units"}, right:{kind:"source",source:"factor"} };
  w.fields[1].required = true; w.fields[1].recipe = {kind:"copy",source:"empty"};
  const run = evaluate(w, source("Units,Factor,Empty\nTwelve,Bad,"));
  const items = reviewIssues(run.rows[0].issues);
  expect(items).toHaveLength(2);
  expect(items[0].sources).toEqual([{source:"units",operand:"left"},{source:"factor",operand:"right"}]);
  expect(items[1].issue.code).toBe("required");
  expect(items[1].sources).toEqual([{source:"empty"}]);
  expect(run.summary.invalid).toBe(1);
});

test("numeric policy failure identifies the rule rather than blaming valid source operands", () => {
  const w = makeWorkflow(["Cases"]);
  w.fields[0].type = "number"; w.fields[0].required = true;
  w.fields[0].recipe = {kind:"calculate",operation:"divide",left:{kind:"source",source:"units"},right:{kind:"number",decimal:"3"}};
  const [item] = reviewIssues(evaluate(w, source("Units\n1")).rows[0].issues);
  expect(item.issue.code).toBe("nonterminating-division");
  expect(item.sources).toEqual([]);
  expect(item.rule).toBe(w.fields[0].id);
});

test("same-text independent failures and warnings are never accidentally grouped", () => {
  const w = makeWorkflow(["One", "Two"]);
  w.fields[0].recipe = {kind:"copy",source:"one"}; w.fields[0].maxLength = 1;
  w.fields[1].recipe = {kind:"copy",source:"two"}; w.fields[1].maxLength = 1;
  const run = evaluate(w, source("One,Two\n=RISK,=RISK"));
  const items = reviewIssues(run.rows[0].issues);
  expect(items).toHaveLength(4);
  expect(items.filter(item => item.issue.severity === "warning")).toHaveLength(2);
  expect(run.summary).toMatchObject({invalid:1,warningIssues:2,errorIssues:2});
});

test("constant zero divisor and copy precision failures target explicit settings", () => {
  const w=makeWorkflow(["Division","Quantity"]);
  w.fields[0].type="number";w.fields[0].recipe={kind:"calculate",operation:"divide",left:{kind:"source",source:"units"},right:{kind:"number",decimal:"0"}};
  w.fields[1].type="number";w.fields[1].scale=0;w.fields[1].recipe={kind:"copy",source:"units"};
  const items=reviewIssues(evaluate(w,source("Units\n1.5")).rows[0].issues);
  expect(items.map(i=>i.sources)).toEqual([[],[]]);
  expect(items.map(i=>i.rule)).toEqual(w.fields.map(f=>f.id));
});

test("identical failed calculation rules share a source cause across their output fields",()=>{
  const w=makeWorkflow(["Cases","CasesCopy"]);
  w.fields.forEach(f=>{
    f.type="number";f.required=true;
    f.recipe={kind:"calculate",operation:"divide",left:{kind:"source",source:"units"},right:{kind:"number",decimal:"4"}};
  });
  const run=evaluate(w,source("Units\nTwelve"));
  expect(run.summary).toMatchObject({invalid:1,errorIssues:4});
  const items=reviewIssues(run.rows[0].issues);
  expect(items).toHaveLength(1);
  expect(items[0].fields).toEqual(w.fields.map(f=>f.id));
  expect(items[0].sources).toEqual([{source:"units",operand:"left"}]);
});
