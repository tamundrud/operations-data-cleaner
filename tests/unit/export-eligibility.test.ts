import { expect, test } from 'vitest';
import * as XLSX from 'xlsx';
import { evaluate } from '../../src/engine/recipes';
import { makeWorkflow } from '../../src/engine/workflow';
import { parseCsv, serializeCsv } from '../../src/formats/csv';
import { serializeXlsx } from '../../src/formats/xlsx-export';

const source = () => parseCsv(new TextEncoder().encode('ID,Required\n001,A\n002,\n=WARNING,C'), ',', 'partial');
const workflow = () => {
  const w = makeWorkflow(['Reference', 'Required']);
  w.fields.forEach((f, i) => { f.recipe = {kind:'copy',source:i ? 'required' : 'id'}; f.required = true; });
  return w;
};
test('partial CSV requires acknowledgement and exports every eligible row, including warnings, in original order', () => {
  const w = workflow(), run = evaluate(w, source());
  expect(run.summary).toMatchObject({candidates:3, valid:1, warningOnly:1, invalid:1});
  expect(() => serializeCsv(w, run, 'raw')).toThrow(/acknowledge/i);
  const bytes = serializeCsv(w, run, 'raw', true);
  expect(new TextDecoder().decode(bytes)).toBe('Reference,Required\r\n001,A\r\n=WARNING,C\r\n');
  expect(() => serializeCsv(w, run, undefined, true)).toThrow(/formula-like/);
  expect(run.rows).toHaveLength(3);
  expect(run.rows[1]).toMatchObject({record:3,line:3,status:'invalid'});
});
test('partial Excel exports only eligible typed values', () => {
  const w = workflow(); w.output.format = 'xlsx';
  const run = evaluate(w, source());
  expect(() => serializeXlsx(w, run)).toThrow(/acknowledge/i);
  const bytes = serializeXlsx(w, run, true);
  const book = XLSX.read(bytes, {type:'array'});
  expect(XLSX.utils.sheet_to_json(book.Sheets.Output, {header:1})).toEqual([
    ['Reference','Required'], ['001','A'], ['=WARNING','C'],
  ]);
  expect(book.Sheets.Output.A3.t).toBe('s'); expect(book.Sheets.Output.A3.f).toBeUndefined();
});
test('acknowledgement never allows workflow errors or zero eligible records', () => {
  const w = workflow(), table = source();
  table.rows = [table.rows[1]];
  for (const format of ['csv','xlsx'] as const) {
    w.output.format = format;
    const serialize = () => format === 'csv'
      ? serializeCsv(w, evaluate(w, table), 'raw', true)
      : serializeXlsx(w, evaluate(w, table), true);
    expect(serialize).toThrow(/at least one|no eligible/i);
    w.fields[0].recipe = undefined;
    expect(serialize).toThrow(/Map every field|workflow/i);
    w.fields[0].recipe = {kind:'copy',source:'id'};
  }
});
