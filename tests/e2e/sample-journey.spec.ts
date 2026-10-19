import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { download, upload } from './helpers';

test('visitor sample and integrated logistics backup run in a fresh browser with exact CSV and typed Excel output', async ({page,browser},info) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Try sample data',exact:true}).focus();
  await page.keyboard.press('Enter');
  expect(await download(page)).toEqual(await readFile('examples/u2/expected.csv'));
  const fresh=await browser.newContext({baseURL:'http://127.0.0.1:4173',serviceWorkers:'block'});
  try {
    const next=await fresh.newPage(); await next.goto('/');
    await next.getByLabel('Import workflow',{exact:true}).setInputFiles('examples/release/workflow.json');
    await upload(next,await readFile('examples/release/source.csv','utf8'));
    const expected=await readFile('examples/release/expected.csv');
    expect(await download(next)).toEqual(expected);
    await next.getByLabel('Workflow name',{exact:true}).fill('Synthetic release demonstration');
    await next.getByRole('button',{name:'Save workflow',exact:true}).click();
    await expect(next.getByText('Saved in this browser.',{exact:true})).toBeVisible();
    const id=await next.getByLabel('Saved workflows',{exact:true}).inputValue();
    await next.reload(); await next.getByLabel('Saved workflows',{exact:true}).selectOption(id);
    await next.getByRole('button',{name:'Open workflow',exact:true}).click();
    await upload(next,await readFile('examples/release/source.csv','utf8'));
    expect(await download(next)).toEqual(expected);
    const backupEvent=next.waitForEvent('download');
    await next.getByRole('button',{name:'Download workflow',exact:true}).click();
    const backup=await readFile((await (await backupEvent).path())!);
    expect(backup.toString()).not.toMatch(/001234|009876|Fictional Cedar Depot|synthetic\.csv/);
    const transfer=await browser.newContext({baseURL:'http://127.0.0.1:4173',serviceWorkers:'block'});
    try {
      const imported=await transfer.newPage(); await imported.goto('/');
      await imported.getByLabel('Import workflow',{exact:true}).setInputFiles({name:'portable-logistics.json',mimeType:'application/json',buffer:backup});
      await upload(imported,await readFile('examples/release/source.csv','utf8'));
      expect(await download(imported)).toEqual(expected);
    } finally { await transfer.close(); }
    for(const width of [1366,1024,390]) {
      await next.setViewportSize({width,height:900});
      expect(await next.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect((await new AxeBuilder({page:next}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
      if(info.project.name==='chromium') await next.screenshot({path:`docs/reviews/u13/demo-${width}.png`,fullPage:true});
    }
    await next.getByRole('button',{name:'Edit workflow',exact:true}).click();
    await next.getByLabel('Output format',{exact:true}).selectOption('xlsx');
    const event=next.waitForEvent('download'); await next.getByRole('button',{name:'Download converted Excel',exact:true}).click();
    const book=XLSX.read(await readFile((await (await event).path())!),{type:'array'});
    const values=XLSX.utils.sheet_to_json<unknown[]>(book.Sheets.Output,{header:1,raw:false});
    const csv=Papa.parse<string[]>(expected.toString(),{skipEmptyLines:true}).data;
    expect(values).toEqual(csv);
    expect(book.Sheets.Output.A2.t).toBe('s'); expect(book.Sheets.Output.A2.v).toBe('001234');
    expect(book.Sheets.Output.I2.t).toBe('n'); expect(book.Sheets.Output.I2.v).toBe(6);
    for(const [key,cell] of Object.entries(book.Sheets.Output)) if(!key.startsWith('!')) expect(cell.f).toBeUndefined();
  } finally { await fresh.close(); }
});
