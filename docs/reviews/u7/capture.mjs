import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.U2_CHROMIUM_PATH||'/usr/bin/chromium'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[], observations=[];
page.on('pageerror',e=>errors.push(e.message));
const label=name=>page.getByLabel(name,{exact:true});
const button=name=>page.getByRole('button',{name,exact:true});
async function done(){await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();}
async function capture(state,width){
 await page.setViewportSize({width,height:1000});
 if(state==='rounding-settings')await label('Rounding').scrollIntoViewIfNeeded();
 observations.push({state,width,noPageOverflow:await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth),noDialogOverflow:await page.locator('dialog[open]').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth))});
 await page.screenshot({path:`docs/reviews/u7/${state}-${width}.png`,fullPage:state==='workspace'});
}
try{
 await page.goto('http://127.0.0.1:4173/');
 await label('Upload source CSV').setInputFiles({name:'synthetic-u7.csv',mimeType:'text/csv',buffer:Buffer.from('Units,Units per case,Cases,Reference\n24,4,15,001234\n48,4,30,001235')});
 await page.locator('.workspace').waitFor();
 await page.locator('details.bulk-columns summary').click();
 await page.getByLabel('New column names').fill('Cases out\nWeight'); await button('Add columns').click();
 for(const [header,left,right,operation] of [['Cases out','units','units per case','divide'],['Weight','cases','12','multiply']]){
  await button(`Edit ${header}`).click(); await label('Calculate with numbers').check();
  await label('First source').selectOption(left); await label('Operation').selectOption(operation);
  if(header==='Weight'){await label('Second operand type').selectOption('number');await label('Second fixed number').fill(right);}
  else {await label('Second source').selectOption(right);await label('Require whole numbers before rounding').check();}
  await done();
 }
 await expect(button('Download converted CSV')).toBeEnabled();
 for(const width of [1440,1024,390])await capture('workspace',width);
 await button('Edit Cases out').click();
 for(const width of [1440,390])await capture('calculation-settings',width);
 await label('Require whole numbers before rounding').uncheck();
 await label('Rounding').selectOption('half-even');
 for(const width of [1440,390])await capture('rounding-settings',width);
 if(errors.length||observations.some(o=>!o.noPageOverflow||!o.noDialogOverflow))throw new Error('UI errors or overflow');
 await writeFile('docs/reviews/u7/capture.json',JSON.stringify({browser:browser.version(),errors,observations},null,2)+'\n');
}finally{await browser.close();}
