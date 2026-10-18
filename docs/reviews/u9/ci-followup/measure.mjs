/* global performance, window, setInterval, document */
import { chromium } from 'playwright';
import { representative } from '../../../../tests/qualification/xlsx/fixtures.mjs';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(() => { const s = { last: performance.now(), gap: 0 }; window.u9Measure = s; setInterval(() => { const now = performance.now(); s.gap = Math.max(s.gap, now - s.last); s.last = now; },20); });
  await page.getByLabel('Upload source CSV', { exact: true }).setInputFiles({ name: 'synthetic.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(representative()) });
  await page.getByLabel('Worksheet', { exact: true }).selectOption('Synthetic');
  await page.getByRole('button', { name: 'Import selected worksheet', exact: true }).click();
  await page.getByLabel('Upload source CSV', { exact: true }).waitFor({ state: 'visible' });
  await page.locator('.workspace').waitFor();
  const closed = await page.evaluate(() => ({ domNodes: document.querySelectorAll('*').length, sourceNodes: document.querySelector('.source-inspection').querySelectorAll('*').length, maxHeartbeatGapMs: window.u9Measure.gap }));
  await page.locator('.source-inspection > summary').click();
  await page.locator('.source-inspection section').waitFor({ state: 'visible' });
  const open = await page.evaluate(() => ({ domNodes: document.querySelectorAll('*').length, sourceNodes: document.querySelector('.source-inspection').querySelectorAll('*').length }));
  console.log(JSON.stringify({ closed, open }));
} finally { await browser.close(); }
