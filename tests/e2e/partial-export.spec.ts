import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdir, readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { upload, add, map, edit, closeSettings, download } from './helpers';

async function setup(page: Page, csv: string) {
  await page.goto('/'); await upload(page, csv, 'PRIVATE_U12_FILE.csv');
  await add(page, ['Reference', 'Required']);
  await map(page, 'Reference', 'id'); await map(page, 'Required', 'required');
  await edit(page, 'Required'); await page.getByText('Validation (optional)',{exact:true}).click(); await page.getByLabel('Required value', {exact:true}).check(); await closeSettings(page);
}
const acknowledgement = (page: Page) => page.getByLabel(/I acknowledge that .* invalid rows will be excluded/);

test('500 candidates export exactly 490 acknowledged eligible records with visible warnings and all 10 exclusions privately', async ({page,context}, info) => {
  const unexpected:string[]=[], diagnostics:string[]=[];
  const assets=new Set(['/', '/index.html', ...(await readdir('dist/assets')).map(f=>'/assets/'+f)]);
  await context.route('**/*', async route=>{
    const r=route.request(),u=new URL(r.url()),payload=JSON.stringify([r.url(),r.headers(),r.postData()]);
    if(u.origin!=='http://127.0.0.1:4173'||r.method()!=='GET'||!assets.has(u.pathname)||u.search||payload.includes('PRIVATE_U12')) {unexpected.push(payload);await route.abort();}
    else await route.continue();
  });
  await context.routeWebSocket(/.*/,ws=>{unexpected.push(ws.url());ws.close();});
  page.on('console',m=>diagnostics.push(m.text()));page.on('pageerror',e=>diagnostics.push(e.message));
  const rows=Array.from({length:500},(_,i)=>[i===0?'=PRIVATE_U12_WARNING':`PRIVATE_U12_${String(i).padStart(4,'0')}`,i%50===49?'':'ok']);
  await setup(page,'ID,Required\n'+rows.map(r=>r.join(',')).join('\n'));
  const counts=page.getByLabel('Full dataset counts');
  await expect(counts).toContainText('Candidate rows 500'); await expect(counts).toContainText('Valid 489');
  await expect(counts).toContainText('Warning rows 1'); await expect(counts).toContainText('Invalid 10');
  const button=page.getByRole('button',{name:'Download converted CSV',exact:true});
  await expect(button).toBeDisabled();
  await page.getByLabel('Preserve raw text for TMS import').check();
  await expect(button).toBeDisabled();
  await page.getByLabel('Show only excluded (invalid) rows').check();
  const refs=page.getByRole('region',{name:'Output preview, scroll horizontally'});
  for(let i=0;i<10;i++) await expect(refs).toContainText(`${51+i*50} / ${51+i*50}`);
  await expect(page.getByLabel('Exception details')).toContainText('Required');
  await expect(page.getByLabel('Partial export review')).toContainText('490 eligible rows');
  await expect(page.getByLabel('Partial export review')).toContainText('10 invalid rows');
  if(info.project.name==='chromium') await page.locator('.review').screenshot({path:'docs/reviews/u12/screenshots/partial-review-desktop.png'});
  await acknowledgement(page).focus(); await page.keyboard.press('Space');
  await expect(counts).toContainText('Excluded 10'); await expect(button).toBeEnabled();
  const bytes=await download(page);
  expect(bytes.toString()).toBe('Reference,Required\r\n'+rows.filter((_,i)=>i%50!==49).map(r=>r.join(',')+'\r\n').join(''));
  await expect(counts).toContainText('Warning rows 1');
  await page.getByLabel('Output format',{exact:true}).selectOption('xlsx');
  const excel=page.getByRole('button',{name:'Download converted Excel',exact:true});
  await expect(excel).toBeDisabled(); await acknowledgement(page).check();
  const event=page.waitForEvent('download'); await excel.click();
  const result=await readFile((await (await event).path())!);
  const book=XLSX.read(result,{type:'array'});
  expect(XLSX.utils.sheet_to_json(book.Sheets.Output,{header:1})).toEqual([['Reference','Required'],...rows.filter((_,i)=>i%50!==49)]);
  expect(book.Sheets.Output.A2.f).toBeUndefined();
  await page.getByLabel('Workflow name',{exact:true}).fill('U12 synthetic');
  await page.getByRole('button',{name:'Save workflow',exact:true}).click();
  await expect(page.getByText('Saved in this browser.',{exact:true})).toBeVisible();
  const savedId=await page.getByLabel('Saved workflows',{exact:true}).inputValue();
  const backup=page.waitForEvent('download'); await page.getByRole('button',{name:'Download workflow',exact:true}).click();
  const portable=await readFile((await (await backup).path())!,'utf8');
  expect(portable).not.toMatch(/PRIVATE_U12|partialAcknowledged|invalidOnly/);
  await page.reload(); await expect(page.getByLabel('Full dataset counts')).toHaveCount(0);
  await page.getByLabel('Saved workflows',{exact:true}).selectOption(savedId);
  await page.getByRole('button',{name:'Open workflow',exact:true}).click();
  await upload(page,'ID,Required\nNEW,ok\nBAD,');
  await expect(acknowledgement(page)).not.toBeChecked();
  await expect(page.getByRole('button',{name:'Download converted Excel',exact:true})).toBeDisabled();
  expect(unexpected).toEqual([]); expect(diagnostics.join('\n')).not.toContain('PRIVATE_U12');
  await info.attach('partial-export-privacy.json',{body:JSON.stringify({unexpected,diagnosticLeaks:0,candidates:500,exported:490,excluded:10}),contentType:'application/json'});
});

test('every excluded row and issue is accessible across pages; acknowledgement survives navigation only',async({page},info)=>{
  await setup(page,'ID,Required\n'+Array.from({length:140},(_,i)=>`ID${i},${i%2?'':'ok'}`).join('\n'));
  await page.getByLabel('Show only excluded (invalid) rows').check();
  await expect(page.getByRole('region',{name:'Output preview, scroll horizontally'}).locator('tbody tr')).toHaveCount(50);
  await acknowledgement(page).check();
  const next=page.getByRole('button',{name:'Next page',exact:true}); await next.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('region',{name:'Output preview, scroll horizontally'}).locator('tbody tr')).toHaveCount(20);
  await expect(page.getByLabel('Exception details')).toContainText('Record 141, line 141');
  await expect(acknowledgement(page)).toBeChecked();
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    if(info.project.name==='chromium') await page.locator('.review').screenshot({path:`docs/reviews/u12/screenshots/exclusions-${width}.png`});
  }
  await page.getByLabel('Include UTF-8 BOM').check();
  await expect(acknowledgement(page)).not.toBeChecked();
  await acknowledgement(page).check();
  await edit(page,'Required'); await page.getByText('Validation (optional)',{exact:true}).click(); await page.getByLabel('Maximum characters').fill('2'); await closeSettings(page);
  await expect(acknowledgement(page)).not.toBeChecked();
  await acknowledgement(page).check();
  await page.getByText('Inspect original source table',{exact:true}).click();
  await page.getByRole('button',{name:'Correct Required, record 3',exact:true}).click();
  await page.getByLabel('Replacement for Required, record 3',{exact:true}).fill('ok');
  await page.getByRole('button',{name:'Apply correction',exact:true}).click();
  await expect(acknowledgement(page)).not.toBeChecked(); await acknowledgement(page).check();
  await page.getByLabel('Upload source CSV').setInputFiles({name:'new.csv',mimeType:'text/csv',buffer:Buffer.from('ID,Required\nNEW,ok\nBAD,')});
  await page.getByRole('button',{name:'Replace source and discard corrections',exact:true}).click();
  await expect(acknowledgement(page)).not.toBeChecked();
});

test('formula handling changes reset partial acknowledgement and zero eligible rows remain blocked',async({page})=>{
  await setup(page,'ID,Required\n=WARNING,ok\nBAD,');
  await page.getByLabel('Preserve raw text for TMS import').check();
  await acknowledgement(page).check();
  await page.getByLabel('Escape risky text with an apostrophe').check();
  await expect(acknowledgement(page)).not.toBeChecked();
  await acknowledgement(page).check();
  expect((await download(page)).toString()).toBe("Reference,Required\r\n'=WARNING,ok\r\n");
  await upload(page,'ID,Required\nBAD,');
  await expect(page.getByText(/No eligible rows/)).toBeVisible();
  await expect(acknowledgement(page)).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Download converted CSV',exact:true})).toBeDisabled();
  await add(page,['Unmapped']);
  await expect(page.getByText('Mapping needs attention',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Download converted CSV',exact:true})).toBeDisabled();
});

test('production worker enforces permission and current revision independently of UI controls',async({page})=>{
  const {makeWorkflow}=await import('../../src/engine/workflow');
  const workflow=makeWorkflow(['Reference']);
  workflow.fields[0].recipe={kind:'copy',source:'id'}; workflow.fields[0].required=true;
  const workerFile=(await readdir('dist/assets')).find(f=>f.startsWith('processing.worker-'))!;
  await page.goto('/');
  const result=await page.evaluate(async({workflow,workerFile})=>{
    const worker=new Worker('/assets/'+workerFile,{type:'module'});let request=0;
    const send=(payload:object)=>new Promise<import('../../src/session/worker-protocol').Response>((resolve,reject)=>{
      worker.onmessage=e=>resolve(e.data);worker.onerror=()=>reject(new Error('Worker failed'));
      worker.postMessage({request:++request,dataset:'u12-worker',revision:0,...payload});
    });
    try {
      await send({kind:'import',workflow,delimiter:',',bytes:new TextEncoder().encode('ID,Other\n001,x\n,x').buffer});
      const blocked=await send({kind:'export'});
      const approved=await send({kind:'export',partialAcknowledged:true});
      workflow.output.delimiter=';';await send({kind:'run',workflow,revision:1});
      const stale=await send({kind:'export',partialAcknowledged:true,revision:0});
      const renewed=await send({kind:'export',revision:1});
      return {blocked,bytes:approved.kind==='download'?new TextDecoder().decode(approved.bytes):null,stale,renewed};
    } finally {worker.terminate();}
  },{workflow,workerFile});
  expect(result.blocked).toMatchObject({kind:'error',message:expect.stringMatching(/acknowledge/)});
  expect(result.bytes).toBe('Reference\r\n001\r\n');
  expect(result.stale.kind).toBe('error');
  expect(result.renewed).toMatchObject({kind:'error',message:expect.stringMatching(/acknowledge/)});
});

test('10000 candidate rows retain every eligible record and exact hidden-page exclusions',async({page},info)=>{
  const rows=Array.from({length:10000},(_,i)=>`${String(i).padStart(6,'0')},${i%1000===999?'':'ok'}`);
  await setup(page,'ID,Required\n'+rows.join('\n'));
  await expect(page.getByLabel('Full dataset counts')).toContainText('Candidate rows 10000');
  await expect(page.getByLabel('Partial export review')).toContainText('9990 eligible rows');
  const start=performance.now();
  await page.getByLabel('Show only excluded (invalid) rows').check();
  await expect(page.getByRole('region',{name:'Output preview, scroll horizontally'})).toContainText('10001 / 10001');
  await acknowledgement(page).check();
  expect((await download(page)).toString()).toBe('Reference,Required\r\n'+rows.filter((_,i)=>i%1000!==999).join('\r\n')+'\r\n');
  await info.attach('partial-10000-timing.json',{body:JSON.stringify({rows:10000,exported:9990,excluded:10,reviewThroughDownloadMs:performance.now()-start,environment:'Codex Cloud system Chromium; not the reference laptop'}),contentType:'application/json'});
});

test('Excel partial export keeps worksheet row provenance after offset headers, skipped blanks and exception pagination',async({page},info)=>{
  // @ts-expect-error Independently authored synthetic OOXML fixtures are JavaScript.
  const {workbook}=await import('../qualification/xlsx/fixtures.mjs');
  const cell=(ref:string,text:string)=>`<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
  const bytes=workbook('<row r="1"/>'+`<row r="3">${cell('A3','ID')}${cell('B3','Required')}</row>`+
    `<row r="4">${cell('A4','000001')}${cell('B4','ok')}</row><row r="5"/>`+
    Array.from({length:60},(_,i)=>`<row r="${i+6}">${cell('A'+(i+6),'BAD'+i)}</row>`).join('')+
    `<row r="66">${cell('A66','000002')}<c r="B66"><f>1+1</f><v>2</v></c></row>`,{dimension:'A1:B66'});
  await page.goto('/');
  const picker=page.getByLabel('Upload source CSV',{exact:true}),chooser=page.getByLabel('Worksheet',{exact:true});
  await picker.setInputFiles({name:'synthetic-u12-provenance.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(bytes)});
  await expect.poll(async()=>await chooser.isVisible()||await picker.isEnabled()).toBe(true);
  if(await chooser.isVisible()) {
    await chooser.selectOption('Synthetic');
    await page.getByRole('button',{name:'Import selected worksheet',exact:true}).click();
  }
  await expect(picker).toBeEnabled();
  await add(page,['Reference','Required']);await map(page,'Reference','id');await map(page,'Required','required');
  await edit(page,'Required');await page.getByText('Validation (optional)',{exact:true}).click();
  await page.getByLabel('Required value',{exact:true}).check();await closeSettings(page);
  const counts=page.getByLabel('Full dataset counts');
  for(const text of ['Input rows 63','Skipped blanks 1','Candidate rows 62','Valid 1','Warning rows 1','Invalid 60']) await expect(counts).toContainText(text);
  const button=page.getByRole('button',{name:'Download converted CSV',exact:true});await expect(button).toBeDisabled();
  await page.getByLabel('Show only excluded (invalid) rows').check();
  const preview=page.getByRole('region',{name:'Output preview, scroll horizontally'});
  await expect(preview.locator('tbody tr')).toHaveCount(50);
  for(let row=6;row<=55;row++) await expect(preview).toContainText(`Synthetic · ${row} / ${row}`);
  await acknowledgement(page).check();await page.getByRole('button',{name:'Next page',exact:true}).click();
  await expect(preview.locator('tbody tr')).toHaveCount(10);
  for(let row=56;row<=65;row++) await expect(preview).toContainText(`Synthetic · ${row} / ${row}`);
  await expect(page.getByLabel('Exception details')).toContainText('Synthetic · Record 65, line 65:');
  await expect(acknowledgement(page)).toBeChecked();
  if(info.project.name==='chromium') await page.locator('.review').screenshot({path:'docs/reviews/u12/screenshots/workbook-source-exclusions.png'});
  expect((await download(page)).toString()).toBe('Reference,Required\r\n000001,ok\r\n000002,2\r\n');
  await expect(counts).toContainText('Warning rows 1');await expect(counts).toContainText('Excluded 60');
});
