import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Run against npm run preview after npm run build, from the repository root.
const browser = await chromium.launch({
  ...(process.env.U2_CHROMIUM_PATH ? { executablePath: process.env.U2_CHROMIUM_PATH } : {}),
});
const output = new URL('./', import.meta.url);
const results = [];
try {
  for (const width of [1440, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173');
    await page.getByRole('button', { name: 'Try fixed fields example', exact: true }).click();
    await page.getByRole('button', { name: 'Download converted CSV', exact: true }).waitFor({ state: 'visible' });
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download converted CSV', exact: true }).click();
    const downloaded = await pending;
    const bytes = await readFile(await downloaded.path());
    const expected = await readFile('examples/u3-expected.csv');
    if (!bytes.equals(expected)) throw new Error('U3 sample download differs from golden bytes');
    if (await page.locator('html').evaluate(node => node.scrollWidth > node.clientWidth))
      throw new Error(`Page overflow at ${width}px`);
    await page.screenshot({ path: fileURLToPath(new URL(`workspace-${width}.png`, output)), fullPage: true });
    await page.locator('.matched-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
    await page.locator('.matching').screenshot({ path: fileURLToPath(new URL(`completed-values-${width}.png`, output)) });
    await page.locator('.matched-scroll').evaluate(node => { node.scrollTop = 0; });
    await page.getByRole('button', { name: 'Edit Weight', exact: true }).click();
    await page.screenshot({ path: fileURLToPath(new URL(`fixed-settings-${width}.png`, output)) });
    await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Consignee', exact: true }).click();
    await page.screenshot({ path: fileURLToPath(new URL(`trim-settings-${width}.png`, output)) });
    if (errors.length) throw new Error(errors.join('\n'));
    results.push({ width, height: 900, overflow: false, pageErrors: errors, exactSampleBytes: true });
    await page.close();
  }
  await writeFile(new URL('capture.json', output), JSON.stringify({ browser: browser.version(), results }, null, 2) + '\n');
} finally {
  await browser.close();
}
