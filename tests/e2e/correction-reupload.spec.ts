import { test, expect } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { upload, add, map, calculation, download, edit, closeSettings } from './helpers';
async function correct(page: import('@playwright/test').Page, header: string, record: number, value: string) {
  if(!await page.getByLabel('Replacement for '+header+', record '+record, {exact:true}).isVisible()) await page.getByRole('button', {name: 'Correct '+header+', record '+record, exact:true}).click();
  await page.getByLabel('Replacement for '+header+', record '+record, {exact:true}).fill(value);
  await page.getByRole('button', {name:'Apply 1 corrections',exact:true}).first().click();
  await expect(page.locator('.status-bar [role=status]')).not.toContainText('Rechecking');
}
test('source corrections repair dependents, revert, preserve replacement failures and recover cancelled parsing privately', async ({page, context}, info) => {
  const unexpected: string[] = [], diagnostics: string[] = [];
  const assets = new Set(['/', '/index.html', ...(await readdir('dist/assets')).map(f=>'/assets/'+f)]);
  await context.route('**/*', async route => {
    const r=route.request(), u=new URL(r.url());
    if(u.origin!=='http://127.0.0.1:4173'||r.method()!=='GET'||!assets.has(u.pathname)||u.search) {unexpected.push(r.url()); await route.abort();}
    else await route.continue();
  });
  await context.routeWebSocket(/.*/, ws=>{unexpected.push(ws.url());ws.close();});
  page.on('console',m=>diagnostics.push(m.text())); page.on('pageerror',e=>diagnostics.push(e.message));
  await page.goto('/'); await upload(page,'ID,Qty\nPRIVATE_U11_ORIGINAL,Twenty Four','PRIVATE_U11_FILE.csv');
  await add(page,['Reference','Double','Triple']); await map(page,'Reference','id');
  await calculation(page,'Double','qty','2','multiply',true);
  await calculation(page,'Triple','qty','3','multiply',true);
  await page.getByText('Inspect original source table',{exact:true}).click();
  await correct(page,'Qty',2,'24');
  expect((await download(page)).toString()).toBe('Reference,Double,Triple\r\nPRIVATE_U11_ORIGINAL,48,72\r\n');
  await expect(page.getByRole('region',{name:'Source table, scroll horizontally'})).toContainText('Original: Twenty Four');
  await correct(page,'ID',2,'PRIVATE_U11_CORRECTED');
  await page.getByLabel('Workflow name',{exact:true}).fill('U11 synthetic');
  const backupEvent=page.waitForEvent('download'); await page.getByRole('button',{name:'Download workflow',exact:true}).click();
  const portable=await readFile((await (await backupEvent).path())!);
  expect(portable.toString()).not.toMatch(/PRIVATE_U11|Twenty Four/);
  await page.getByRole('button',{name:'Save workflow',exact:true}).click();
  await expect(page.getByText('Saved in this browser.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Revert Qty, record 2',exact:true}).click();
  await page.getByRole('button',{name:'Apply 1 corrections',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'Download converted CSV',exact:true})).toBeDisabled();
  await correct(page,'Qty',2,'24');
  if(!await page.getByLabel('Replacement for Qty, record 2',{exact:true}).isVisible()) await page.getByRole('button',{name:'Correct Qty, record 2',exact:true}).click();
  await page.getByRole('region',{name:'Source table, scroll horizontally'}).screenshot({path:'docs/reviews/u11/screenshots/correction-editor.png'});
  await page.getByLabel('Replacement for Qty, record 2',{exact:true}).locator('..').locator('..').getByRole('button',{name:'Cancel edit',exact:true}).click();
  await page.screenshot({path:'docs/reviews/u11/screenshots/corrected-desktop.png',fullPage:true});
  await page.getByLabel('Upload source CSV').setInputFiles({name:'replacement.csv',mimeType:'text/csv',buffer:Buffer.from('ID,Qty\nNEW,2')});
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.screenshot({path:'docs/reviews/u11/screenshots/replacement-warning.png',fullPage:true});
  await page.getByRole('button',{name:'Keep current source',exact:true}).click();
  expect((await download(page)).toString()).toContain('PRIVATE_U11_CORRECTED,48,72');
  await page.getByLabel('Upload source CSV').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('ID,ID\na,b')});
  await page.getByRole('button',{name:'Replace source and discard corrections',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect((await download(page)).toString()).toContain('PRIVATE_U11_CORRECTED,48,72');
  await page.evaluate(()=>{
    const original=File.prototype.arrayBuffer;
    File.prototype.arrayBuffer=async function() {
      if(this.name==='hold.csv') await new Promise<void>(resolve=>Reflect.set(window,'releaseU11',resolve));
      return original.call(this);
    };
  });
  await page.getByLabel('Upload source CSV').setInputFiles({name:'hold.csv',mimeType:'text/csv',buffer:Buffer.from('ID,Qty\nNEW,2')});
  await page.getByRole('button',{name:'Replace source and discard corrections',exact:true}).click();
  await page.getByRole('button',{name:'Cancel processing',exact:true}).click();
  await expect(page.getByRole('button',{name:'Download converted CSV',exact:true})).toHaveCount(0);
  await page.evaluate(()=>Reflect.get(window,'releaseU11')?.());
  await page.getByRole('button',{name:'Retry active file',exact:true}).click();
  expect((await download(page)).toString()).toContain('PRIVATE_U11_CORRECTED,48,72');
  await page.getByText('Inspect original source table',{exact:true}).click();
  await expect(page.getByRole('region',{name:'Source table, scroll horizontally'})).toContainText('Original: Twenty Four');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'docs/reviews/u11/screenshots/corrected-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:720});
  await page.getByLabel('Upload source CSV').setInputFiles({name:'replacement.csv',mimeType:'text/csv',buffer:Buffer.from('ID,Qty\nNEW,2')});
  await page.getByRole('button',{name:'Replace source and discard corrections',exact:true}).click();
  expect((await download(page)).toString()).toBe('Reference,Double,Triple\r\nNEW,4,6\r\n');
  await page.reload(); await expect(page.getByLabel('Full dataset counts')).toHaveCount(0);
  const stored=await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('operations-data-cleaner-workflows');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const result:unknown[]=[]; for(const name of db.objectStoreNames) result.push(await new Promise(resolve=>{const r=db.transaction(name).objectStore(name).getAll();r.onsuccess=()=>resolve(r.result);}));
    db.close(); return JSON.stringify(result);
  });
  expect(stored).not.toMatch(/PRIVATE_U11|Twenty Four/);
  expect(unexpected).toEqual([]); expect(diagnostics.join('\n')).not.toMatch(/PRIVATE_U11|Twenty Four/);
  await info.attach('privacy.json',{body:JSON.stringify({unexpected,diagnosticLeaks:0}),contentType:'application/json'});
});
test('10000 rows retain identity after clearing and correcting a later preview page',async({page,browser},info)=>{
  await page.goto('/'); await upload(page,'ID\n'+Array.from({length:10000},(_,i)=>String(i).padStart(6,'0')).join('\n'));
  await add(page,['Reference']); await map(page,'Reference','id');
  await page.getByRole('button',{name:'Next page',exact:true}).click();
  await page.getByText('Inspect original source table',{exact:true}).click();
  await page.getByRole('button',{name:'Next source page',exact:true}).click();
  const start=performance.now(); await correct(page,'ID',52,'');
  const bytes=await download(page);
  expect(bytes.toString()).toBe('Reference\r\n'+Array.from({length:10000},(_,i)=>(i===50?'':String(i).padStart(6,'0'))+'\r\n').join(''));
  await expect(page.getByLabel('Full dataset counts')).toContainText('Candidate rows 10000');
  const elapsed=performance.now()-start;
  await info.attach('correction-timing.json',{body:JSON.stringify({rows:10000,correctionThroughExportMs:elapsed,browser:browser.version(),environment:'Codex Cloud, not reference laptop'}),contentType:'application/json'});
  expect(elapsed).toBeLessThan(5000);
});

test('filtered exception correction targets the matching source identity',async({page})=>{
  await page.goto('/'); await upload(page,'Qty\n24\nBad\nWrong');
  await add(page,['Cases']); await calculation(page,'Cases','qty','2','multiply',true);
  await page.getByLabel('Show only rows with exceptions').check();
  await page.getByText('Inspect original source table',{exact:true}).click();
  await page.getByLabel('Source row filter',{exact:true}).selectOption('exceptions');
  await expect(page.getByRole('button',{name:'Correct Qty, record 2',exact:true})).toHaveCount(0);
  await correct(page,'Qty',3,'12');
  const source=page.getByRole('region',{name:'Source table, scroll horizontally'});
  await expect(source.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByLabel('Replacement for Qty, record 3',{exact:true})).toHaveValue('12');
  await expect(source).toContainText('Original: Bad');
  await expect(source.locator('tbody tr').first()).toContainText('valid');
  await page.getByLabel('Source row filter',{exact:true}).selectOption('all');
  await page.getByLabel('Source row filter',{exact:true}).selectOption('exceptions');
  await expect(page.getByRole('button',{name:'Correct Qty, record 3',exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Replacement for Qty, record 3',{exact:true})).toHaveCount(0);
  await correct(page,'Qty',4,'6');
  expect((await download(page)).toString()).toBe('Cases\r\n48\r\n24\r\n12\r\n');
});

test('production worker rejects stale correction requests after a newer rule revision',async({page})=>{
  const {makeWorkflow}=await import('../../src/engine/workflow');
  const workflow=makeWorkflow(['Qty']); workflow.fields[0].recipe={kind:'copy',source:'qty'};
  const workerFile=(await readdir('dist/assets')).find(f=>f.startsWith('processing.worker-'))!;
  await page.goto('/');
  const result=await page.evaluate(async ({workflow,workerFile})=>{
    const worker=new Worker('/assets/'+workerFile,{type:'module'});
    let request=0;
    const send=(payload:object)=>new Promise<import('../../src/session/worker-protocol').Response>((resolve,reject)=>{
      worker.onmessage=e=>resolve(e.data);worker.onerror=()=>reject(new Error('Worker failed'));
      worker.postMessage({request:++request,dataset:'stale-test',revision:0,...payload});
    });
    try {
      const first=await send({kind:'import',bytes:new TextEncoder().encode('Qty\n24').buffer,delimiter:',',workflow});
      if(first.kind!=='view') throw new Error('Import failed');
      const row=first.view.rows[0].id;
      await send({kind:'correct-batch',revision:1,edits:[{row,column:'qty',value:'48'}]});
      await send({kind:'run',revision:2,workflow});
      const stale=await send({kind:'correct-batch',revision:1,edits:[{row,column:'qty',value:'OLD'}]});
      const rejectedBatch=await send({kind:'correct-batch',revision:3,edits:[{row,column:'qty',value:'99'},{row,column:'missing',value:'X'}]});
      const current=await send({kind:'page',revision:2,page:0,exceptions:false});
      return {stale,rejectedBatch,current};
    } finally {worker.terminate();}
  },{workflow,workerFile});
  expect(result.stale.kind).toBe('error');
  expect(result.rejectedBatch.kind).toBe('error');
  expect(result.current.revision).toBe(2);
  expect(result.current.kind==='view' && result.current.view.rows[0].values).toEqual([{kind:'text',text:'48'}]);
});

test('cancelling replacement in the parsing worker restores corrected provenance and exports',async({page})=>{
  await page.goto('/'); await upload(page,'ID\nORIGINAL');
  await add(page,['Reference']); await map(page,'Reference','id');
  await page.getByText('Inspect original source table',{exact:true}).click();
  await correct(page,'ID',2,'CORRECTED');
  const csv=['ID',...Array.from({length:19},(_,i)=>'X'+i)].join(',')+'\n'+
    Array.from({length:90000},(_,i)=>String(i).padStart(6,'0')+','+Array(19).fill('synthetic').join(',')).join('\n');
  await page.getByLabel('Upload source CSV').setInputFiles({name:'parsing.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByRole('button',{name:'Replace source and discard corrections',exact:true}).click();
  await expect(page.locator('.status-bar [role=status]')).toContainText('Importing and checking CSV');
  await page.getByRole('button',{name:'Cancel processing',exact:true}).click();
  await page.getByRole('button',{name:'Retry active file',exact:true}).click();
  expect((await download(page)).toString()).toBe('Reference\r\nCORRECTED\r\n');
  await expect(page.getByLabel('Full dataset counts')).toContainText('Candidate rows 1');
  await expect(page.getByLabel('Full dataset counts')).toContainText('Corrected 1');
  await page.getByText('Inspect original source table',{exact:true}).click();
  await expect(page.getByRole('region',{name:'Source table, scroll horizontally'})).toContainText('Original: ORIGINAL');
});

test('missing trailing source cells can be corrected and reverted',async({page})=>{
  await page.goto('/'); await upload(page,'ID,Qty\n001234');
  await add(page,['Quantity']); await map(page,'Quantity','qty');
  await page.getByText('Inspect original source table',{exact:true}).click();
  await correct(page,'Qty',2,'24');
  expect((await download(page)).toString()).toBe('Quantity\r\n24\r\n');
  await page.getByRole('button',{name:'Revert Qty, record 2',exact:true}).click();
  await page.getByRole('button',{name:'Apply 1 corrections',exact:true}).first().click();
  expect((await download(page)).toString()).toBe('Quantity\r\n\r\n');
});


test('Excel source corrections retain original typed details and export literal IDs and calendar dates',async({page})=>{
  // @ts-expect-error Independently authored synthetic OOXML fixtures are JavaScript.
  const {workbook}=await import('../qualification/xlsx/fixtures.mjs');
  const {unzipSync,strFromU8}=await import('fflate');
  const bytes=workbook('<row r="1"><c r="A1" t="inlineStr"><is><t>ID</t></is></c><c r="B1" t="inlineStr"><is><t>Date</t></is></c></row><row r="2"><c r="A2" s="1"><v>1234</v></c><c r="B2" t="e"><v>#VALUE!</v></c></row>',{dimension:'A1:B2'});
  await page.goto('/');
  const picker=page.getByLabel('Upload source CSV',{exact:true}), chooser=page.getByLabel('Worksheet',{exact:true});
  await picker.setInputFiles({name:'synthetic-corrections.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(bytes)});
  await expect.poll(async()=>await chooser.isVisible()||await picker.isEnabled()).toBe(true);
  if(await chooser.isVisible()) {
    await chooser.selectOption('Synthetic');
    await page.getByRole('button',{name:'Import selected worksheet',exact:true}).click();
  }
  await expect(picker).toBeEnabled();
  await add(page,['Reference','Delivery']); await map(page,'Reference','id'); await map(page,'Delivery','date');
  await edit(page,'Delivery');
  await page.getByLabel('Output type',{exact:true}).selectOption('date');
  await page.getByLabel('Source date format',{exact:true}).selectOption('excel');
  await page.getByLabel('Output date format',{exact:true}).selectOption('YYYY-MM-DD');
  await closeSettings(page);
  await page.getByText('Inspect original source table',{exact:true}).click();
  await correct(page,'ID',2,'000012'); await correct(page,'Date',2,'2024-02-29');
  const source=page.getByRole('region',{name:'Source table, scroll horizontally'});
  await expect(source).toContainText('Original: 001234');
  await expect(source).toContainText('Original: #VALUE!');
  for(const details of await source.locator('details').all()) await details.locator('summary').click();
  await expect(source).toContainText('1234'); await expect(source).toContainText('000000');
  await page.getByLabel('Output format',{exact:true}).selectOption('xlsx');
  const event=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download converted Excel',exact:true}).click();
  const output=unzipSync(await readFile((await (await event).path())!));
  expect(strFromU8(output['xl/sharedStrings.xml'])).toContain('000012');
  const sheet=strFromU8(output['xl/worksheets/sheet1.xml']);
  expect(sheet).toMatch(/<c[^>]*r="B2"[^>]*><v>45351<\/v>/);
  expect(sheet).not.toContain('<f>');
  await page.getByRole('button',{name:'Revert Date, record 2',exact:true}).click();
  await page.getByRole('button',{name:'Apply 1 corrections',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'Download converted Excel',exact:true})).toBeDisabled();
});
