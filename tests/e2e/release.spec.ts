import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { download, upload } from './helpers';

for(const sourceFormat of ['csv','xlsx'] as const) test(`integrated ${sourceFormat} input supports partial export, correction and both output formats`,async({page})=>{
  await page.goto('/');
  await page.getByLabel('Import workflow',{exact:true}).setInputFiles('examples/release/workflow.json');
  const text=await readFile('examples/release/needs-correction.csv','utf8');
  if(sourceFormat==='csv') await upload(page,text);
  else {
    const book=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(Papa.parse<string[]>(text,{skipEmptyLines:true}).data),'Orders');
    await page.getByLabel('Upload source CSV').setInputFiles({name:'synthetic-orders.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(XLSX.write(book,{type:'buffer',bookType:'xlsx'}))});
  }
  const counts=page.getByLabel('Full dataset counts');
  await expect(counts).toContainText('Candidate rows 2'); await expect(counts).toContainText('Invalid 1');
  await expect(page.getByRole('button',{name:'Download converted CSV',exact:true})).toBeDisabled();
  await page.getByLabel(/I acknowledge that .* invalid rows will be excluded/).check();
  const rows=Papa.parse<string[]>((await download(page)).toString(),{skipEmptyLines:true}).data;
  expect(rows).toHaveLength(2); expect(rows[1][0]).toBe('001234');
  await page.getByText('Inspect original source table',{exact:true}).click();
  await page.getByRole('button',{name:'Correct Units, record 3',exact:true}).click();
  await page.getByLabel('Replacement for Units, record 3',{exact:true}).fill('12');
  await page.getByRole('button',{name:'Apply 1 corrections',exact:true}).first().click();
  await expect(counts).toContainText('Invalid 0');
  expect(await download(page)).toEqual(await readFile('examples/release/expected.csv'));
  await page.getByRole('button',{name:'Edit workflow',exact:true}).click();
  await page.getByLabel('Output format',{exact:true}).selectOption('xlsx');
  const event=page.waitForEvent('download'); await page.getByRole('button',{name:'Download converted Excel',exact:true}).click();
  const book=XLSX.read(await readFile((await (await event).path())!),{type:'array'});
  expect(book.Sheets.Output.A3.v).toBe('009876'); expect(book.Sheets.Output.I3.v).toBe(3);
});
