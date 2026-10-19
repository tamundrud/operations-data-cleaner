import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { zipSync, unzipSync } from "fflate";
import { mkdir, readFile, readdir } from "node:fs/promises";
// @ts-expect-error U1's independently authored OOXML qualification fixtures are JavaScript.
import { workbook, hostile, representative } from "../qualification/xlsx/fixtures.mjs";
import { add, calculation, closeSettings, download as csvDownload, edit, map, upload } from "./helpers";

const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const headers = ["ID", "Padded", "Amount", "Date", "Cached", "Missing", "Long ID", "Unsupported", "Note"];
const stringCell = (ref: string, value: string) => `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`;
function fidelityBook(epoch = false) {
  return workbook(
    '<row r="1"/>' +
    `<row r="3">${headers.map((h, i) => stringCell(`${String.fromCharCode(65 + i)}3`, h)).join("")}</row>` +
    '<row r="4">' + stringCell("A4", "001234") +
    '<c r="B4" s="1"><v>1234</v></c><c r="C4"><v>0.1</v></c>' +
    `<c r="D4" s="2"><v>${epoch ? 43889 : 45351}</v></c>` +
    '<c r="E4"><f>WEBSERVICE("https://example.invalid/U1_PRIVATE_SENTINEL")</f><v>7</v></c>' +
    '<c r="F4"><f>1+2</f></c><c r="G4"><v>1234567890123456</v></c><c r="H4" s="4"><v>1234</v></c>' +
    stringCell("I4", "U1_PRIVATE_SENTINEL") + '</row>',
    { epoch, dimension: "A1:I4" },
  ) as Uint8Array;
}
async function selectSheet(page: Page, sheet = "Synthetic") {
  const chooser = page.getByLabel("Worksheet", { exact: true });
  await expect(chooser).toBeVisible();
  await chooser.selectOption({ label: sheet });
  await page.getByRole("button", { name: "Import selected worksheet", exact: true }).click();
  await expect(chooser).not.toBeVisible();
  await expect(page.getByLabel("Upload source CSV", { exact: true })).toBeEnabled();
}
async function finishImport(page: Page) {
  const picker = page.getByLabel("Upload source CSV", { exact: true });
  const chooser = page.getByLabel("Worksheet", { exact: true });
  await expect.poll(async () => (await chooser.isVisible()) || (await picker.isEnabled())).toBe(true);
  if (await chooser.isVisible()) await selectSheet(page);
  await expect(picker).toBeEnabled();
}
async function uploadBook(page: Page, bytes: Uint8Array, name = "synthetic-u9.xlsx") {
  const picker = page.getByLabel("Upload source CSV", { exact: true });
  await expect(picker).toBeEnabled();
  await picker.setInputFiles({ name, mimeType, buffer: Buffer.from(bytes) });
  await finishImport(page);
  await expect(page.locator(".workspace")).toBeVisible();
}
async function download(page: Page) {
  const safety = page.getByLabel("Escape risky text with an apostrophe", { exact: true });
  await expect.poll(async () => (await safety.isVisible()) || (await page.getByRole("button", { name: "Download converted CSV", exact: true }).isEnabled())).toBe(true);
  if (await safety.isVisible()) await safety.check();
  return csvDownload(page);
}
async function configureDate(page: Page, field = "Delivery") {
  await edit(page, field);
  await page.getByLabel("Output type", { exact: true }).selectOption("date");
  await page.getByLabel("Source date format", { exact: true }).selectOption("excel");
  await page.getByLabel("Output date format", { exact: true }).selectOption("YYYY-MM-DD");
  await closeSettings(page);
}

test("U9 worksheet choice, Excel metadata and exact identifier, arithmetic, date and cached bytes", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByText("Upload source CSV or Excel", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Upload source CSV", { exact: true })).toHaveAttribute("accept", /\.xlsx/);
  await uploadBook(page, fidelityBook());
  await add(page, ["Reference", "Formatted reference", "Quantity", "Delivery", "Cached result"]);
  await map(page, "Reference", "id");
  await map(page, "Formatted reference", "padded");
  await calculation(page, "Quantity", "amount", "2", "multiply", true);
  await map(page, "Delivery", "date");
  await configureDate(page);
  await map(page, "Cached result", "cached");
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.locator(".review")).toContainText(/cached|stale/i);
  expect(await download(page)).toEqual(Buffer.from("Reference,Formatted reference,Quantity,Delivery,Cached result\r\n001234,001234,0.2,2024-02-29,7\r\n"));
  await page.locator(".source-inspection > summary").click();
  const source = page.getByRole("region", { name: "Source table, scroll horizontally", exact: true });
  await expect(source).toContainText("001234");
  await expect(source).toContainText(/Synthetic/);
  await expect(source).toContainText(/4/);
  const metadata = source.locator("details");
  expect(await metadata.count()).toBeGreaterThan(0);
  for (const item of await metadata.all()) await item.locator("summary").click();
  await expect(source).toContainText(/1234/);
  await expect(source).toContainText(/000000/);
  await expect(source).toContainText(/WEBSERVICE/);
  await expect(source).toContainText(/raw/i);
  await expect(source).toContainText(/type/i);
  if (info.project.name === "chromium") {
    await mkdir("docs/reviews/u9", { recursive: true });
    await page.screenshot({ path: "docs/reviews/u9/excel-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "docs/reviews/u9/excel-mobile.png", fullPage: true });
    expect(await page.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("U9 both date epochs, invalid dates and missing cached formulas remain inspectable errors", async ({ page }) => {
  await page.goto("/");
  await uploadBook(page, fidelityBook(true));
  await add(page, ["Delivery"]);
  await map(page, "Delivery", "date");
  await configureDate(page);
  expect(await download(page)).toEqual(Buffer.from("Delivery\r\n2024-02-29\r\n"));
  await add(page, ["Missing result"]);
  await map(page, "Missing result", "missing");
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  await expect(page.locator(".review")).toContainText(/cached|formula/i);
  const invalid = workbook('<row r="1">' + stringCell("A1", "Date") + '</row><row r="2"><c r="A2" s="2"><v>60</v></c></row>', { dimension: "A1:A2" });
  await page.reload();
  await uploadBook(page, invalid);
  await add(page, ["Delivery"]);
  await map(page, "Delivery", "date");
  await configureDate(page);
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  await expect(page.locator(".review")).toContainText(/1900|serial|date/i);
});

test("U9 selected worksheet, first nonblank header, blank rows and footer retain original semantics", async ({ page }) => {
  await page.goto("/");
  const bytes = workbook('<row r="3">' + stringCell("A3", "ID") + '</row><row r="4">' + stringCell("A4", "001234") + '</row><row r="5"/><row r="7">' + stringCell("A7", "Footer") + '</row>', { dimension: "A1:A7" });
  await upload(page, "ID\n001234");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await page.getByLabel("Upload source CSV", { exact: true }).setInputFiles({ name: "other.xlsx", mimeType, buffer: Buffer.from(bytes) });
  await page.getByRole("button", { name: "Cancel worksheet selection", exact: true }).click();
  expect(await download(page)).toEqual(Buffer.from("Reference\r\n001234\r\n"));
  await uploadBook(page, bytes);
  expect(await download(page)).toEqual(Buffer.from("Reference\r\n001234\r\nFooter\r\n"));
  await page.reload();
  await page.getByLabel("Upload source CSV", { exact: true }).setInputFiles({ name: "other.xlsx", mimeType, buffer: Buffer.from(bytes) });
  await selectSheet(page, "Other");
  await add(page, ["Selected"]);
  await map(page, "Selected", "other");
  expect(await download(page)).toEqual(Buffer.from("Selected\r\n99\r\n"));
});

test("U9 XLSX templates supply names and order only; saved and portable workflows reuse Excel input", async ({ page, browser }) => {
  await page.goto("/");
  await uploadBook(page, fidelityBook());
  const template = workbook('<row r="1">' + stringCell("A1", "Reference") + stringCell("B1", "Delivery") + '</row><row r="2">' + stringCell("A2", "DO_NOT_IMPORT_TEMPLATE_VALUES") + '</row>', { dimension: "A1:B2" });
  await page.getByLabel("Upload destination CSV template", { exact: true }).setInputFiles({ name: "template.xlsx", mimeType, buffer: Buffer.from(template) });
  await expect(page.getByLabel("Worksheet", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Import selected worksheet", exact: true })).toBeDisabled();
  await finishImport(page);
  await expect(page.getByRole("button", { name: /^Select output / })).toHaveCount(2);
  await map(page, "Reference", "id");
  await map(page, "Delivery", "date");
  await configureDate(page);
  const expected = Buffer.from("Reference,Delivery\r\n001234,2024-02-29\r\n");
  expect(await download(page)).toEqual(expected);
  await page.getByLabel("Workflow name", { exact: true }).fill("Synthetic Excel reuse");
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const id = await page.getByLabel("Saved workflows", { exact: true }).inputValue();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  const json = await readFile((await (await event).path())!, "utf8");
  expect(json).not.toMatch(/001234|U1_PRIVATE_SENTINEL|WEBSERVICE|synthetic-u9.xlsx|DO_NOT_IMPORT_TEMPLATE_VALUES/);
  await page.reload();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await uploadBook(page, fidelityBook(true));
  expect(await download(page)).toEqual(expected);
  const fresh = await browser.newContext({ baseURL: "http://127.0.0.1:4173", serviceWorkers: "block", timezoneId: "Pacific/Kiritimati" });
  try {
    const next = await fresh.newPage();
    await next.goto("/");
    await next.getByLabel("Import workflow", { exact: true }).setInputFiles({ name: "u9.json", mimeType: "application/json", buffer: Buffer.from(json) });
    await uploadBook(next, fidelityBook());
    expect(await download(next)).toEqual(expected);
  } finally { await fresh.close(); }
});

test("U9 long numeric identifiers and unsupported display formats warn without inventing digits", async ({ page }) => {
  await page.goto("/");
  await uploadBook(page, fidelityBook());
  await add(page, ["Long reference", "Uncertain reference"]);
  await map(page, "Long reference", "long id");
  await map(page, "Uncertain reference", "unsupported");
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.locator(".review")).toContainText(/precision|digits|Excel.*lost/i);
  await expect(page.locator(".review")).toContainText(/unsupported|format/i);
  expect(await download(page)).toEqual(Buffer.from("Long reference,Uncertain reference\r\n1.23457E+15,1234\r\n"));
});

test("U9 integrated worker rejects every U1 hostile fixture and preserves the prior run", async ({ page }, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  const timings: Record<string, { selectionThroughDownloadMs: number; rejectionAfterSelectionMs: number }> = {};
  const attacks = hostile() as Record<string, Uint8Array>;
  // U1 uses its 8 MiB compression probe with a custom 1 MiB budget.
  // Exercise the actual production 100 MiB budget here.
  attacks.bomb = workbook("", { extra: { "bomb.bin": new Uint8Array(101 * 1024 * 1024) } });
  let downloads = 0;
  for (const [name, bytes] of Object.entries(attacks)) {
    // Chromium rate-limits the eleventh rapid download, including CSV. Pace this
    // synthetic burst outside the measured rejection interval.
    if (downloads > 0 && downloads % 10 === 0) await page.waitForTimeout(1100);
    await test.step(name, async () => {
      const start = performance.now();
      await page.getByLabel("Upload source CSV", { exact: true }).setInputFiles({ name: `${name}.xlsx`, mimeType, buffer: Buffer.from(bytes) });
      const selectionFinished = performance.now();
      await expect(page.getByRole("alert")).toBeVisible();
      const rejected = performance.now();
      await expect(page.getByLabel("Worksheet", { exact: true })).not.toBeVisible();
      await expect(page.getByLabel("Upload source CSV", { exact: true })).toBeEnabled();
      expect(await download(page)).toEqual(Buffer.from("Reference\r\n001234\r\n"));
      timings[name] = { selectionThroughDownloadMs: performance.now() - start, rejectionAfterSelectionMs: rejected - selectionFinished };
      // File-picker automation transport (not app processing) moves the 25 MiB size probe.
      expect(timings[name].rejectionAfterSelectionMs).toBeLessThan(5000);
      downloads++;
    });
  }
  await info.attach("u9-hostile-integrated.json", { body: JSON.stringify(timings, null, 2), contentType: "application/json" });
});

test("U9 browser privacy intercepts external links and WEBSERVICE without exposing source data", async ({ page, context }) => {
  const unexpected: string[] = [], diagnostics: string[] = [];
  const assets = new Set((await readdir("dist/assets")).map((name) => `/assets/${name}`));
  assets.add("/"); assets.add("/index.html");
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const payload = JSON.stringify([request.url(), request.headers(), request.postData()]);
    if (payload.includes("U1_PRIVATE_SENTINEL") || url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET" || !assets.has(url.pathname) || url.search) {
      unexpected.push(payload);
      await route.abort();
    } else await route.continue();
  });
  await context.routeWebSocket(/.*/, (ws) => { unexpected.push(`WebSocket ${ws.url()}`); ws.close(); });
  page.on("console", (message) => diagnostics.push(message.text()));
  page.on("pageerror", (error) => diagnostics.push(error.message));
  await page.goto("/");
  await uploadBook(page, fidelityBook(), "U1_PRIVATE_SENTINEL.xlsx");
  await add(page, ["Reference", "Cached result"]);
  await map(page, "Reference", "id");
  await map(page, "Cached result", "cached");
  expect(await download(page)).toEqual(Buffer.from("Reference,Cached result\r\n001234,7\r\n"));
  expect(unexpected).toEqual([]);
  expect(diagnostics.join("\n")).not.toContain("U1_PRIVATE_SENTINEL");
});

test("U9 cancellation stops workbook processing and retries the unchanged active source", async ({ page }) => {
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await page.locator(".source-inspection > summary").click();
  await expect(page.locator(".source-inspection section")).toBeVisible();
  await page.getByLabel("Upload source CSV", { exact: true }).setInputFiles({ name: "large-replacement.xlsx", mimeType, buffer: Buffer.from(representative()) });
  await expect(page.locator(".status-bar [role=status]")).toContainText("Importing and checking file");
  const start = performance.now();
  await page.getByRole("button", { name: "Cancel processing", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("cancelled");
  expect(performance.now() - start).toBeLessThan(1000);
  await page.getByRole("button", { name: "Retry active file", exact: true }).click();
  expect(await download(page)).toEqual(Buffer.from("Reference\r\n001234\r\n"));
  await expect(page.locator(".source-inspection section")).toHaveCount(0);
});

test("U9 10000-row integrated workbook remains responsive and exports every selected value", async ({ page, browser }, info) => {
  test.setTimeout(120000);
  const bytes = representative() as Uint8Array;
  await page.goto("/");
  await page.evaluate(() => {
    const state = { previous: performance.now(), maxGap: 0, ticks: 0 };
    Reflect.set(window, "u9Heartbeat", state);
    setInterval(() => { const now = performance.now(); state.maxGap = Math.max(state.maxGap, now - state.previous); state.previous = now; state.ticks++; }, 20);
  });
  await uploadBook(page, bytes);
  await add(page, ["Reference", "Last"]);
  await map(page, "Reference", "field 0");
  await map(page, "Last", "field 19");
  const start = performance.now();
  await uploadBook(page, bytes);
  const output = await download(page), elapsed = performance.now() - start;
  const expected = "Reference,Last\r\n" + Array.from({ length: 10000 }, (_, i) => `SYN-${String(i + 2).padStart(6, "0")}-0,${i + 21}\r\n`).join("");
  expect(output).toEqual(Buffer.from(expected));
  await expect(page.getByLabel("Full dataset counts")).toContainText("10000");
  const heartbeat = await page.evaluate(() => Reflect.get(window, "u9Heartbeat") as { maxGap: number; ticks: number });
  expect(heartbeat.ticks).toBeGreaterThan(0);
  expect(heartbeat.maxGap).toBeLessThan(1500);
  await info.attach("u9-10000-integrated.json", { body: JSON.stringify({ rows: 10000, columns: 20, browser: browser.version(), repeatImportThroughDownloadMs: elapsed, heartbeat, environment: "Cloud runner; reference laptop qualification pending" }, null, 2), contentType: "application/json" });
  expect(elapsed).toBeLessThan(5000);
});


test("U9 manual replacements require a fresh worksheet choice and preserve the prior run after a selected-sheet failure", async ({ page }) => {
  await page.goto("/");
  await uploadBook(page, fidelityBook());
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  const expected = Buffer.from("Reference\r\n001234\r\n");
  expect(await download(page)).toEqual(expected);
  const picker = page.getByLabel("Upload source CSV", { exact: true });
  const chooser = page.getByLabel("Worksheet", { exact: true });

  // A matching old sheet name must not silently choose the replacement's table.
  await picker.setInputFiles({ name: "same-name.xlsx", mimeType, buffer: Buffer.from(fidelityBook()) });
  await expect(chooser).toHaveValue("");
  await expect(page.getByRole("button", { name: "Import selected worksheet", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel worksheet selection", exact: true }).click();
  expect(await download(page)).toEqual(expected);

  const badHeaders = workbook('<row r="1">' + stringCell("A1", "ID") + stringCell("B1", "ID") + '</row>', { dimension: "A1:B1" });
  await picker.setInputFiles({ name: "duplicate-headers.xlsx", mimeType, buffer: Buffer.from(badHeaders) });
  await selectSheet(page);
  await expect(page.getByRole("alert")).toContainText("duplicate source headers");
  expect(await download(page)).toEqual(expected);

  // A missing old name must offer the new names, rather than reject discovery.
  const parts = unzipSync(fidelityBook());
  parts["xl/workbook.xml"] = new TextEncoder().encode(new TextDecoder().decode(parts["xl/workbook.xml"]).replace('name="Synthetic"', 'name="Incoming"'));
  await picker.setInputFiles({ name: "renamed-sheet.xlsx", mimeType, buffer: Buffer.from(zipSync(parts)) });
  await expect(chooser).toHaveValue("");
  await selectSheet(page, "Incoming");
  expect(await download(page)).toEqual(expected);
  await expect(page.locator(".status-bar")).toContainText("worksheet Incoming");
  await expect(page.locator(".status-bar")).not.toContainText("delimiter detected");
});

test("U9 source inspection stays deferred after ending an inspected session", async ({ page }) => {
  await page.goto("/");
  await uploadBook(page, fidelityBook());
  await page.locator(".source-inspection > summary").click();
  await expect(page.locator(".source-inspection section")).toBeVisible();
  await page.getByRole("button", { name: "End session", exact: true }).click();
  await uploadBook(page, fidelityBook());
  await expect(page.locator(".source-inspection section")).toHaveCount(0);
  await page.locator(".source-inspection > summary").click();
  await expect(page.locator(".source-inspection section")).toBeVisible();
  const metadata = page.locator(".source-inspection details").first();
  await expect(metadata.locator("dl")).toHaveCount(0);
  await metadata.locator("summary").click();
  await expect(metadata.locator("dl")).toContainText("Raw value");
});
