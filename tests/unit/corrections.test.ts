import { expect, test } from 'vitest';
import { parseCsv } from '../../src/formats/csv';
import { makeWorkflow } from '../../src/engine/workflow';
import { correctedRun, applyCorrectionBatch } from '../../src/session/correction-overlay';
test('corrections repair all dependent fields without changing originals, workflow or candidate identity', () => {
  const source = parseCsv(new TextEncoder().encode('Qty\nTwenty Four'), ',', 'test');
  const w = makeWorkflow(['Cases', 'Weight']);
  w.fields.forEach((f) => { f.type = 'number'; f.recipe = { kind: 'calculate', operation: 'multiply', left: {kind:'source',source:'qty'}, right:{kind:'number',decimal:'2'} }; });
  const before = JSON.stringify(w), id = source.rows[0].id;
  const edits = [{row:id, column:'qty', value:'24'}];
  const run = correctedRun(w, source, edits);
  expect(run.rows[0].values).toEqual([{kind:'number',decimal:'48'}, {kind:'number',decimal:'48'}]);
  expect(run.summary).toMatchObject({corrected:1, valid:1, candidates:1});
  expect(run.rows[0].provenance.filter(p => 'source' in p).every(p => p.corrected)).toBe(true);
  expect(source.rows[0].cells[0].raw).toBe('Twenty Four');
  expect(JSON.stringify(w)).toBe(before);
  expect(correctedRun(w, source, []).summary.invalid).toBe(1);
  const cleared = correctedRun(w, source, [{...edits[0], value:''}]);
  expect(cleared.summary.candidates).toBe(1);
  expect(cleared.rows[0].id).toBe(id);
});

test("incremental corrections and full rule reruns preserve aggregate risks, counts and originals", () => {
  const source = parseCsv(new TextEncoder().encode("Qty\n24\n48"), ",", "test");
  const w = makeWorkflow(["Qty"]); w.fields[0].recipe = {kind:"copy", source:"qty"};
  const first = correctedRun(w, source, []);
  const edits = [{row:source.rows[1].id,column:"qty",value:"=PRIVATE_U11"}];
  const next = correctedRun(w, source, edits, first, source.rows[1].id);
  expect(next.rows[0]).toBe(first.rows[0]);
  expect(next.summary).toMatchObject({candidates:2, valid:1, warningOnly:1, corrected:1});
  expect(next.csvRisk).toBe(true);
  expect(correctedRun(w, source, edits)).toEqual(next);
  w.fields[0].maxLength = 2;
  expect(correctedRun(w, source, edits).summary.invalid).toBe(1);
  const reverted = correctedRun(w, source, []);
  expect(reverted.summary).toMatchObject({valid:2,corrected:0});
  expect(reverted.csvRisk).toBe(false);
});

test("Excel correction preserves original metadata and uses explicit literal text and calendar dates", () => {
  const source = parseCsv(new TextEncoder().encode("ID,Date\n001234,invalid"), ",", "excel");
  source.rows[0].cells[0].excel = {type:"n",value:1234,format:"000000",date1904:false};
  source.rows[0].cells[1].excel = {type:"e",value:60,date1904:false,dateInvalid:true};
  const w = makeWorkflow(["Reference","Delivery"]);
  w.fields[0].recipe = {kind:"copy",source:"id"};
  w.fields[1].recipe = {kind:"copy",source:"date"};
  w.fields[1].type = "date"; w.fields[1].date = {source:"excel",target:"YYYY-MM-DD"};
  const edits = [{row:source.rows[0].id,column:"id",value:"000012"},{row:source.rows[0].id,column:"date",value:"2024-02-29"}];
  const run = correctedRun(w, source, edits);
  expect(run.rows[0].values).toEqual([{kind:"text",text:"000012"},{kind:"date",year:2024,month:2,day:29,format:"YYYY-MM-DD"}]);
  expect(run.summary.valid).toBe(1);
  expect(source.rows[0].cells[1].excel?.type).toBe("e");
  expect(correctedRun(w,source,[]).summary.invalid).toBe(1);
});

test("correction with unfinished mapping keeps full dataset counts", () => {
  const source = parseCsv(new TextEncoder().encode("Qty\n24\n48"), ",", "unfinished");
  const w = makeWorkflow(["Unmapped"]);
  const edits = [{row:source.rows[0].id,column:"qty",value:"12"}];
  const incremental = correctedRun(w,source,edits,correctedRun(w,source,[]),source.rows[0].id);
  expect(incremental.summary).toEqual(correctedRun(w,source,edits).summary);
});
test("missing trailing CSV cells can receive source-only corrections", () => {
  const source = parseCsv(new TextEncoder().encode("ID,Qty\n001234"), ",", "short");
  const w = makeWorkflow(["Qty"]); w.fields[0].recipe={kind:"copy",source:"qty"};
  const edits=[{row:source.rows[0].id,column:"qty",value:"24"}];
  expect(correctedRun(w,source,edits).rows[0].values).toEqual([{kind:"text",text:"24"}]);
  expect(source.rows[0].cells).toHaveLength(1);
});

test("a source batch is validated completely before either cell is changed", () => {
  const source=parseCsv(new TextEncoder().encode("ID,Qty\n001,12\n002,24"),",","batch");
  const original=JSON.stringify(source);
  const edits=[{row:source.rows[0].id,column:"qty",value:"16"},{row:source.rows[1].id,column:"qty",value:"20"}];
  expect(applyCorrectionBatch(source,[],edits)).toEqual(edits);
  expect(()=>applyCorrectionBatch(source,[],[edits[0],{...edits[1],column:"missing"}])).toThrow("current source cell");
  expect(JSON.stringify(source)).toBe(original);
  expect(applyCorrectionBatch(source,edits,[{...edits[0],value:"",revert:true}])).toEqual([edits[1]]);
});
