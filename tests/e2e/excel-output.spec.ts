import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import { makeWorkflow, referencedHeaders, type Workflow } from "../../src/engine/workflow";
import { add, closeSettings, download as csvDownload, edit, fixed, map, move, remove, upload } from "./helpers";
// @ts-expect-error Independently authored synthetic OOXML, not a SheetJS writer fixture.
import { workbook, hostile, representative } from "../qualification/xlsx/fixtures.mjs";

const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const synthetic = "ID,Amount,Date,Unused\n001234,0.3,2024-02-29,PRIVATE_U10_UNUSED";
const strCell = (ref: string, text: string) => `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
function book(epoch = false, sentinel = "PRIVATE_U10_SOURCE") {
  return workbook(`<row r="1">${["ID", "Amount", "Date", "Cached", "Note"].map((h, i) => strCell(`${String.fromCharCode(65 + i)}1`, h)).join("")}</row>` +
    `<row r="2">${strCell("A2", "001234")}<c r="B2"><v>0.3</v></c><c r="C2" s="2"><v>${epoch ? 43889 : 45351}</v></c><c r="D2"><f>WEBSERVICE("https://example.invalid/U1_PRIVATE_SENTINEL")</f><v>7</v></c>${strCell("E2", sentinel)}</row>`, { epoch, dimension: "A1:E2", extra: { "synthetic-unused.bin": new Uint8Array([1, 2, 3]), "xl/vbaProject.bin": new Uint8Array([0, 1, 2]) } }) as Uint8Array;
}
function config(excel = false): Workflow {
  const w = makeWorkflow(["Reference", "Amount", "Delivery", "Blank", "Literal"]);
  w.id = "synthetic-u10"; w.name = "Synthetic Excel output";
  w.output.format = "xlsx";
  w.source = { ...w.source, format: excel ? "xlsx" : "csv", ...(excel ? { worksheet: "Synthetic" } : {}) };
  w.fields[0].recipe = { kind: "copy", source: "id" };
  w.fields[1] = { ...w.fields[1], type: "number", recipe: { kind: "copy", source: "amount" } };
  w.fields[2] = { ...w.fields[2], type: "date", recipe: { kind: "copy", source: "date" }, date: { source: excel ? "excel" : "YYYY-MM-DD", target: "MM/DD/YYYY" } };
  w.fields[3].recipe = { kind: "constant", value: { kind: "blank" } };
  w.fields[4].recipe = { kind: "constant", value: { kind: "text", text: '=HYPERLINK("literal")' } };
  w.source.referencedHeaders = referencedHeaders(w.fields);
  return w;
}
async function importConfig(page: Page, w: Workflow | string) {
  await page.getByLabel("Import workflow", { exact: true }).setInputFiles({ name: "synthetic-u10.json", mimeType: "application/json", buffer: Buffer.from(typeof w === "string" ? w : JSON.stringify(w)) });
  await expect(page.getByRole("region", { name: "Repeat workflow", exact: true })).toBeVisible();
}
async function uploadBook(page: Page, bytes = book(), name = "synthetic-u10.xlsx") {
  const picker = page.getByLabel("Upload source CSV", { exact: true });
  await expect(picker).toBeEnabled();
  await picker.setInputFiles({ name, mimeType, buffer: Buffer.from(bytes) });
  const chooser = page.getByLabel("Worksheet", { exact: true });
  await expect.poll(async () => (await chooser.isVisible()) || (await picker.isEnabled())).toBe(true);
  if (await chooser.isVisible()) {
    await chooser.selectOption("Synthetic");
    await page.getByRole("button", { name: "Import selected worksheet", exact: true }).click();
  }
  await expect(picker).toBeEnabled();
  await expect(page.getByLabel("Full dataset counts")).toBeVisible();
}
async function download(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download converted Excel", exact: true }).click();
  const file = await event;
  expect(file.suggestedFilename()).toBe("converted.xlsx");
  return readFile((await file.path())!);
}
function inspect(bytes: Uint8Array) {
  const parts = Object.fromEntries(Object.entries(unzipSync(bytes)).map(([name, content]) => [name, strFromU8(content)]));
  for (const [name, content] of Object.entries(parts)) {
    expect(name).not.toMatch(/externalLinks|vbaProject|worksheets\/.*\.rels|synthetic-unused/iu);
    expect(content).not.toMatch(/<f[\s>]|<hyperlink\b|TargetMode="External"|WEBSERVICE|PRIVATE_U10_UNUSED|DBNum1/u);
  }
  return parts;
}
function cell(sheet: string, ref: string) {
  return new RegExp(`<c\\b[^>]*\\br="${ref}"[^>]*>[\\s\\S]*?</c>`, "u").exec(sheet)?.[0];
}
function textCell(parts: Record<string, string>, ref: string): string {
  const node = cell(parts["xl/worksheets/sheet1.xml"], ref);
  expect(node).toMatch(/\bt="s"/u);
  const index = Number(/<v>(\d+)<\/v>/u.exec(node!)![1]);
  const strings = [...parts["xl/sharedStrings.xml"].matchAll(/<si><t[^>]*>([\s\S]*?)<\/t><\/si>/gu)];
  expect(index).toBeLessThan(strings.length);
  return strings[index][1];
}
function expectTyped(bytes: Uint8Array, epoch: "1900" | "1904" = "1900", header = true) {
  const parts = inspect(bytes), sheet = parts["xl/worksheets/sheet1.xml"], row = header ? 2 : 1;
  expect(sheet).toContain(`ref="A1:E${row}"`);
  expect(textCell(parts, `A${row}`)).toBe("001234");
  expect(cell(sheet, `B${row}`)).toContain("<v>0.3</v>");
  expect(cell(sheet, `B${row}`)).not.toContain('t="str"');
  expect(cell(sheet, `C${row}`)).toContain(`<v>${epoch === "1900" ? 45351 : 43889}</v>`);
  expect(cell(sheet, `D${row}`)).toBeUndefined();
  expect(textCell(parts, `E${row}`)).toBe('=HYPERLINK(&quot;literal&quot;)');
  expect(parts["xl/styles.xml"]).toContain('formatCode="mm/dd/yyyy"');
  expect(parts["xl/workbook.xml"].includes('date1904="true"')).toBe(epoch === "1904");
}

test("U10 CSV to typed Excel controls, selected columns/order, blanks and literal strings", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/"); await upload(page, synthetic);
  await add(page, ["Reference", "Amount", "Delivery", "Blank", "Literal", "Remove me"]);
  await map(page, "Reference", "id"); await map(page, "Amount", "amount");
  await edit(page, "Amount"); await page.getByLabel("Output type", { exact: true }).selectOption("number"); await closeSettings(page);
  await map(page, "Delivery", "date");
  await edit(page, "Delivery"); await page.getByLabel("Output type", { exact: true }).selectOption("date");
  await page.getByLabel("Source date format", { exact: true }).selectOption("YYYY-MM-DD");
  await page.getByLabel("Output date format", { exact: true }).selectOption("MM/DD/YYYY"); await closeSettings(page);
  await fixed(page, "Blank", "blank"); await fixed(page, "Literal", "text", '=HYPERLINK("literal")');
  await remove(page, "Remove me");
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  await page.getByLabel("Output format", { exact: true }).selectOption("xlsx");
  await expect(page.getByLabel("CSV delimiter", { exact: true })).not.toBeVisible();
  await expect(page.getByLabel("Excel date system", { exact: true })).toHaveValue("1900");
  await expect(page.getByText("Spreadsheet formula warning — choose before download")).not.toBeVisible();
  const generated = await download(page);
  expectTyped(generated);
  await info.attach("u10-synthetic-output.xlsx", { body: generated, contentType: mimeType });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  if (info.project.name === "chromium") {
    await mkdir("docs/reviews/u10", { recursive: true });
    await page.screenshot({ path: "docs/reviews/u10/excel-output-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "docs/reviews/u10/excel-output-mobile.png", fullPage: true });
    expect(await page.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await move(page, "Amount", "up");
  const parts = inspect(await download(page));
  expect(cell(parts["xl/worksheets/sheet1.xml"], "A2")).toContain("<v>0.3</v>"); expect(textCell(parts, "B2")).toBe("001234");
  await page.getByLabel("Output format", { exact: true }).selectOption("csv");
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  await page.getByLabel("Escape risky text with an apostrophe", { exact: true }).check();
  expect((await csvDownload(page)).toString()).toContain("0.3,001234,02/29/2024,,");
});

test("U10 XLSX to XLSX copies cached values without source formulas, links or package members", async ({ page }) => {
  const w = config(true); w.fields.push({ id: "cached", header: "Cached", type: "number", required: false, recipe: { kind: "copy", source: "cached" } });
  w.source.referencedHeaders = referencedHeaders(w.fields);
  await page.goto("/"); await importConfig(page, w); await uploadBook(page, book(true));
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.locator(".review")).toContainText(/cached|stale/iu);
  const parts = inspect(await download(page)), sheet = parts["xl/worksheets/sheet1.xml"];
  expect(cell(sheet, "F2")).toContain("<v>7</v>");
  expect(textCell(parts, "A2")).toBe("001234"); expect(cell(sheet, "C2")).toContain("<v>45351</v>");
});

test("U10 precision errors block download and offer exact CSV or explicit text alternatives", async ({ page }) => {
  const w = config(); w.fields = [w.fields[1]]; w.source.referencedHeaders = ["amount"];
  await page.goto("/"); await importConfig(page, w);
  await upload(page, "Amount\n1234567890123456");
  const downloads: string[] = []; page.on("download", (d) => downloads.push(d.suggestedFilename()));
  await page.getByRole("button", { name: "Download converted Excel", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/record 2.*Amount.*CSV.*text/iu);
  expect(downloads).toEqual([]);
  await page.getByRole("button", { name: "Edit workflow", exact: true }).click();
  await page.getByLabel("Output format", { exact: true }).selectOption("csv");
  expect((await csvDownload(page)).toString()).toBe("Amount\r\n1234567890123456\r\n");
  await edit(page, "Amount"); await page.getByLabel("Output type", { exact: true }).selectOption("text"); await closeSettings(page);
  await page.getByLabel("Output format", { exact: true }).selectOption("xlsx");
  expect(textCell(inspect(await download(page)), "A2")).toBe("1234567890123456");
});

test("U10 saved and portable workflows preserve Excel settings and all types across browser timezones", async ({ page, browser }) => {
  const w = config(); w.output = { ...w.output, dateSystem: "1904", header: false, delimiter: ";", bom: true };
  await page.goto("/"); await importConfig(page, w); await upload(page, synthetic, "PRIVATE_U10_FILENAME.csv");
  expectTyped(await download(page), "1904", false);
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const id = await page.getByLabel("Saved workflows", { exact: true }).inputValue();
  const event = page.waitForEvent("download"); await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  const json = await readFile((await (await event).path())!, "utf8");
  expect(JSON.parse(json).output).toEqual(w.output);
  expect(json).not.toMatch(/001234|PRIVATE_U10_FILENAME|PRIVATE_U10_UNUSED/u);
  await page.reload(); await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
  await page.getByRole("button", { name: "Open workflow", exact: true }).click(); await upload(page, synthetic);
  expectTyped(await download(page), "1904", false);
  for (const timezoneId of ["America/Los_Angeles", "Pacific/Kiritimati"]) {
    const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173", serviceWorkers: "block", timezoneId });
    try {
      const next = await context.newPage(); await next.goto("/"); await importConfig(next, json); await upload(next, synthetic);
      expectTyped(await download(next), "1904", false);
    } finally { await context.close(); }
  }
});

test("U10 invalid rows and stale configuration continue to block Excel export", async ({ page }) => {
  const w = config(); w.fields[0].required = true;
  await page.goto("/"); await importConfig(page, w); await upload(page, "ID,Amount,Date\n,0.3,2024-02-29");
  await expect(page.getByRole("button", { name: "Download converted Excel", exact: true })).toBeDisabled();
  await expect(page.locator(".review")).toContainText("1 invalid rows");
  await upload(page, synthetic); expectTyped(await download(page));
  await page.getByRole("button", { name: "Edit workflow", exact: true }).click();
  // A draft edit disables the previous finalized revision immediately.
  await page.getByLabel("Include header row").uncheck();
  await expect(page.getByRole("button", { name: "Download converted Excel", exact: true })).toBeDisabled();
  expectTyped(await download(page), "1900", false);
});

test("U10 privacy covers both source formats, cached formulas, Excel settings, saved work and downloads", async ({ page, context }) => {
  const sentinel = "PRIVATE_U10_SOURCE", unexpected: string[] = [], diagnostics: string[] = [];
  const assets = new Set(["/", "/index.html", ...(await readdir("dist/assets")).map((name) => `/assets/${name}`)]);
  await context.route("**/*", async (route) => {
    const r = route.request(), url = new URL(r.url()), payload = JSON.stringify([r.url(), r.headers(), r.postData()]);
    if (/PRIVATE_U10|U1_PRIVATE_SENTINEL/u.test(payload) || url.origin !== "http://127.0.0.1:4173" || r.method() !== "GET" || !assets.has(url.pathname) || url.search) {
      unexpected.push(payload); await route.abort();
    } else await route.continue();
  });
  await context.routeWebSocket(/.*/, (ws) => { unexpected.push(ws.url()); ws.close(); });
  page.on("console", (m) => diagnostics.push(m.text())); page.on("pageerror", (e) => diagnostics.push(e.message));
  const response = await page.goto("/"); expect(response!.headers()["content-security-policy"]).toContain("connect-src 'none'");
  await importConfig(page, config()); await upload(page, synthetic, `${sentinel}.csv`); expectTyped(await download(page));
  await page.getByRole("button", { name: "End session", exact: true }).click();
  const w = config(true); w.fields.push({ id: "note", header: "Note", type: "text", required: false, recipe: { kind: "copy", source: "note" } }, { id: "cached", header: "Cached", type: "number", required: false, recipe: { kind: "copy", source: "cached" } });
  w.source.referencedHeaders = referencedHeaders(w.fields);
  await importConfig(page, w); await uploadBook(page, book(false, sentinel), `${sentinel}.xlsx`);
  expect(textCell(inspect(await download(page)), "F2")).toBe(sentinel);
  await page.getByRole("button", { name: "Save workflow", exact: true }).click(); await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const stored = await page.evaluate(async () => {
    const rows: unknown[] = [];
    for (const item of await indexedDB.databases()) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(item.name!); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      for (const name of db.objectStoreNames) rows.push(await new Promise((resolve, reject) => { const request = db.transaction(name).objectStore(name).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }));
      db.close();
    }
    return JSON.stringify(rows);
  });
  expect(stored).not.toMatch(/PRIVATE_U10_SOURCE|001234|WEBSERVICE|U1_PRIVATE_SENTINEL/u);
  await page.getByRole("button", { name: "End session", exact: true }).click();
  expect(unexpected).toEqual([]); expect(diagnostics.join("\n")).not.toMatch(/PRIVATE_U10|U1_PRIVATE_SENTINEL/u);
});

test("U10 integrated safeguards reject hostile workbooks while preserving eligible Excel download", async ({ page }, info) => {
  test.setTimeout(120000);
  await page.goto("/"); await importConfig(page, config()); await upload(page, synthetic);
  const attacks = hostile() as Record<string, Uint8Array>;
  attacks.bomb = workbook("", { extra: { "bomb.bin": new Uint8Array(101 * 1024 * 1024) } });
  const timings: Record<string, number> = {};
  for (const [name, bytes] of Object.entries(attacks)) {
    await page.getByLabel("Upload source CSV", { exact: true }).setInputFiles({ name: `${name}.xlsx`, mimeType, buffer: Buffer.from(bytes) });
    const selected = performance.now();
    await expect(page.locator(".status-bar [role=alert]")).toBeVisible();
    timings[name] = performance.now() - selected;
    expect(timings[name]).toBeLessThan(5000); expectTyped(await download(page));
  }
  await info.attach("u10-hostile-integrated.json", { body: JSON.stringify(timings, null, 2), contentType: "application/json" });
});

test("U10 performance exports every 10000 by 20 value from CSV and XLSX without blocking the interface", async ({ page, browser }, info) => {
  test.setTimeout(120000);
  const w = makeWorkflow(Array.from({ length: 20 }, (_, c) => `Field ${c}`));
  w.id = "synthetic-u10-performance"; w.output.format = "xlsx";
  w.fields.forEach((f, c) => { f.type = c % 3 ? "number" : "text"; f.recipe = { kind: "copy", source: `field ${c}` }; });
  w.source.referencedHeaders = referencedHeaders(w.fields);
  await page.goto("/"); await importConfig(page, w);
  await page.evaluate(() => {
    const state = { previous: performance.now(), maxGap: 0, ticks: 0 }; Reflect.set(window, "u10Heartbeat", state);
    setInterval(() => { const now = performance.now(); state.maxGap = Math.max(state.maxGap, now - state.previous); state.previous = now; state.ticks++; }, 20);
  });
  const times: Record<string, number[]> = {}, sizes: Record<string, { downloadBytes: number; expandedBytes: number }> = {};
  const csv = Array.from({ length: 10001 }, (_, r) => r === 0 ? w.fields.map((f) => f.header).join(",") : Array.from({ length: 20 }, (_, c) => c % 3 ? r + 1 + c : `SYN-${String(r + 1).padStart(6, "0")}-${c}`).join(",")).join("\n");
  const xlsx = representative() as Uint8Array;
  for (const format of ["csv", "xlsx"] as const) {
    times[format] = [];
    for (let trial = 0; trial < 6; trial++) {
    const start = performance.now();
    if (format === "xlsx") await uploadBook(page, xlsx);
    else await upload(page, csv);
    const bytes = await download(page);
    times[format].push(performance.now() - start);
    const parts = inspect(bytes), sheet = parts["xl/worksheets/sheet1.xml"];
    sizes[format] = { downloadBytes: bytes.length, expandedBytes: Object.values(parts).reduce((sum, content) => sum + Buffer.byteLength(content), 0) };
    expect(sheet.match(/<row\b/gu)).toHaveLength(10001);
    expect(sheet.match(/<c\b/gu)).toHaveLength(200020);
    const strings = [...parts["xl/sharedStrings.xml"].matchAll(/<si><t[^>]*>([\s\S]*?)<\/t><\/si>/gu)].map((match) => match[1]);
    const digest = createHash("sha256");
    for (const match of sheet.matchAll(/<c\b([^>]*)><v>([^<]*)<\/v><\/c>/gu)) {
      const ref = /\br="([A-Z]+\d+)"/u.exec(match[1])![1], type = /\bt="s"/u.test(match[1]) ? "s" : "n";
      digest.update(`${ref}|${type}|${type === "s" ? strings[Number(match[2])] : match[2]}\n`);
    }
    // Independently generated with Python hashlib from every expected position,
    // type and value of the synthetic 10000 x 20 table, including its headers.
    expect(digest.digest("hex")).toBe("e730b0c71200213e83d16cd5b53ee0fd39a2e4ca94e70686f3b04456987eccff");
    expect(textCell(parts, "A2")).toBe("SYN-000002-0"); expect(cell(sheet, "T10001")).toContain("<v>10020</v>");
    await expect(page.getByLabel("Full dataset counts")).toContainText("10000");
    // KTD-10 gives the full XLSX pipeline 15 seconds; earlier CSV-export
    // performance tests retain their own 5-second budget.
    expect(times[format].at(-1)).toBeLessThan(15000);
    }
  }
  const heartbeat = await page.evaluate(() => Reflect.get(window, "u10Heartbeat") as { maxGap: number; ticks: number });
  expect(heartbeat.ticks).toBeGreaterThan(0); expect(heartbeat.maxGap).toBeLessThan(1500);
  const measurements = Object.fromEntries(Object.entries(times).map(([format, samples]) => {
    const warm = samples.slice(1).sort((a, b) => a - b);
    return [format, { firstMs: samples[0], warmMedianMs: warm[2], warmWorstMs: warm[4], samplesMs: samples }];
  }));
  await info.attach("u10-10000-integrated.json", { body: JSON.stringify({ rows: 10000, columns: 20, browser: browser.version(), importThroughDownload: measurements, sizes, heartbeat, environment: "Codex Cloud; same worker reused across trials, including file-picker transport; reference laptop qualification remains U13" }, null, 2), contentType: "application/json" });
});

test("U10 amplified output fails boundedly rather than silently truncating rows or columns", async ({ page }) => {
  test.setTimeout(60000);
  const w = makeWorkflow(Array.from({ length: 200 }, (_, i) => `Field ${i}`));
  w.id = "synthetic-u10-amplification"; w.output.format = "xlsx";
  w.fields.forEach((f) => { f.recipe = { kind: "copy", source: "id" }; }); w.source.referencedHeaders = ["id"];
  await page.goto("/"); await importConfig(page, w); await upload(page, "ID\n" + Array(10000).fill("001234").join("\n"));
  const start = performance.now(); await page.getByRole("button", { name: "Download converted Excel", exact: true }).click();
  await expect(page.locator(".status-bar [role=alert]")).toContainText(/2 million.*smaller/iu);
  expect(performance.now() - start).toBeLessThan(5000);
});

test("U10 cancelling Excel serialization discards the download and retries the same workflow", async ({ page }) => {
  test.setTimeout(60000);
  const w = makeWorkflow(Array.from({ length: 20 }, (_, i) => `Field ${i}`));
  w.id = "synthetic-u10-cancel"; w.output.format = "xlsx";
  w.fields.forEach((f, i) => { f.recipe = { kind: "copy", source: `field ${i}` }; }); w.source.referencedHeaders = referencedHeaders(w.fields);
  await page.goto("/"); await importConfig(page, w); await uploadBook(page, representative());
  const downloads: string[] = []; page.on("download", (d) => downloads.push(d.suggestedFilename()));
  await page.getByRole("button", { name: "Download converted Excel", exact: true }).click();
  await expect(page.locator(".status-bar [role=status]")).toContainText("Preparing download");
  await page.getByRole("button", { name: "Cancel processing", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("cancelled"); expect(downloads).toEqual([]);
  await page.getByRole("button", { name: "Retry active file", exact: true }).click();
  const parts = inspect(await download(page));
  expect(parts["xl/worksheets/sheet1.xml"].match(/<row\b/gu)).toHaveLength(10001);
  expect(textCell(parts, "A2")).toBe("SYN-000002-0");
});
