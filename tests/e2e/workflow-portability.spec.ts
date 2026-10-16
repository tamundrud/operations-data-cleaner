import { expect, test, type Page } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";
import { download, preview } from "./helpers";

let secondServer: ChildProcess;
test.beforeAll(async () => {
  secondServer = spawn(process.execPath, ["scripts/serve.mjs"], { env: { ...process.env, ODC_PREVIEW_PORT: "4174" }, stdio: "ignore" });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch("http://127.0.0.1:4174")).ok) return; } catch { /* Wait for the isolated production server. */ }
    if (secondServer.exitCode !== null) throw new Error("Portable-workflow production server stopped.");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Portable-workflow production server did not become ready.");
});
test.afterAll(() => { secondServer?.kill(); });
async function importWorkflow(page: Page, json: string) {
  await page.getByLabel("Import workflow", { exact: true }).setInputFiles({ name: "synthetic-workflow.json", mimeType: "application/json", buffer: Buffer.from(json) });
}
async function source(page: Page, text: string) {
  await page.getByLabel("Upload source CSV").setInputFiles({ name: "new-synthetic-source.csv", mimeType: "text/csv", buffer: Buffer.from(text) });
  await expect(page.getByLabel("Upload source CSV")).toBeEnabled();
}
async function backup(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  const file = await event; expect(file.suggestedFilename()).toBe("workflow.json");
  return readFile((await file.path())!, "utf8");
}
const config = () => readFile("examples/u3-workflow.json", "utf8");

test("portable backup runs in a fresh browser and separate local origin without remapping", async ({ page, browser }) => {
  await page.goto("/"); await importWorkflow(page, await config());
  await expect(page.getByRole("button", { name: "Edit workflow", exact: true })).toBeVisible();
  const json = await backup(page);
  const fresh = await browser.newContext({ serviceWorkers: "block" });
  try {
    const allowed = new Set(["/", "/index.html", ...(await readdir("dist/assets")).map((name) => "/assets/" + name)]);
    const unexpected: string[] = [];
    await fresh.route("**/*", async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== "http://127.0.0.1:4174" || request.method() !== "GET" || url.search || !allowed.has(url.pathname)) {
        unexpected.push(request.url()); await route.abort();
      } else await route.continue();
    });
    await fresh.routeWebSocket(/.*/, (socket) => { unexpected.push(socket.url()); socket.close(); });
    const next = await fresh.newPage(); await next.goto("http://127.0.0.1:4174/");
    await expect(next.getByLabel("Saved workflows", { exact: true })).toHaveValue("");
    await importWorkflow(next, json);
    await source(next, "Extra,Consignee,Order\r\nunused,  Fictional Depot  ,000009\r\n");
    await preview(next);
    await expect(next.getByRole("heading", { name: "2. Match your columns", exact: true })).not.toBeVisible();
    expect(await download(next)).toEqual(Buffer.concat([Buffer.from([239, 187, 191]), Buffer.from("000009;0012;Fictional Depot;12.50;\r\n")]));
    const jsonAgain = await backup(next);
    expect(JSON.parse(jsonAgain)).toEqual(JSON.parse(json));
    expect(jsonAgain).not.toContain("000009"); expect(jsonAgain).not.toContain("Fictional Depot");
    await next.getByRole("button", { name: "Edit workflow", exact: true }).click();
    await expect(next.getByRole("heading", { name: "2. Match your columns", exact: true })).toBeVisible();
    expect(unexpected).toEqual([]);
  } finally { await fresh.close(); }
});

test("invalid workflow imports preserve the prior run and compatible headers never guess", async ({ page }) => {
  await page.goto("/"); await importWorkflow(page, await config());
  await source(page, "Order,Consignee\n000001,Depot"); await preview(page);
  const previous = await download(page);
  for (const invalid of ["{", JSON.stringify({ ...JSON.parse(await config()), version: 99 }), JSON.stringify({ ...JSON.parse(await config()), script: "fetch('https://example.invalid')" })]) {
    await importWorkflow(page, invalid);
    await expect(page.getByRole("status").filter({ hasText: /valid JSON|version|structure/i })).toBeVisible();
    expect(await download(page)).toEqual(previous);
  }
  await source(page, "Extra,  CONSIGNEE  , Order \nx,Depot,000002"); await preview(page);
  expect((await download(page)).toString()).toContain("000002;0012;Depot;12.50;");
  await source(page, "Order reference,Consignee\n000003,Depot");
  await expect(page.getByRole("alert")).toContainText("missing");
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  await source(page, "Order, order ,Consignee\n000004,000005,Depot");
  await expect(page.locator(".status-bar [role=alert]")).toContainText(/duplicate/i);
});

test("identity and name collisions require an explicit target or distinct copy", async ({ page }) => {
  await page.goto("/"); await importWorkflow(page, await config());
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  await expect(page.getByText("Keep a portable backup.", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await importWorkflow(page, JSON.stringify({ ...JSON.parse(await config()), id: "synthetic-other-id" }));
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  const conflict = page.getByRole("dialog", { name: "Workflow already exists" });
  await expect(conflict).toBeVisible();
  await conflict.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Saved workflows", { exact: true }).locator("option")).toHaveCount(2);
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await conflict.getByLabel("Replacement or copy name").fill("Synthetic portable copy");
  await conflict.getByRole("button", { name: "Save a copy", exact: true }).click();
  await expect(conflict).not.toBeVisible();
  await expect(page.getByLabel("Saved workflows", { exact: true }).locator("option")).toHaveCount(3);
  const copied = JSON.parse(await backup(page));
  expect(copied.id).not.toBe("synthetic-other-id"); expect(copied.name).toBe("Synthetic portable copy");
});

test("saved source delimiter policy is committed independently of the next upload picker", async ({ page }) => {
  await page.goto("/");
  const definition = JSON.parse(await config()); definition.source.delimiter = ";";
  await importWorkflow(page, JSON.stringify(definition));
  await source(page, "Order;Consignee\r\n000008;Depot\r\n"); await preview(page);
  await page.getByLabel("Source delimiter").selectOption("\t");
  const first = await backup(page); expect(JSON.parse(first).source.delimiter).toBe(";");
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeVisible();
  const id = JSON.parse(first).id;
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await expect(page.getByRole("region", { name: "Repeat workflow", exact: true })).toBeVisible();
  await expect(page.getByLabel("Upload source CSV")).toBeEnabled();
  await expect(page.getByLabel("Source delimiter")).toHaveValue(";");
  await expect(page.getByLabel("Full dataset counts")).not.toBeVisible();
});

test("a late workflow read cannot resurrect a conversion after New conversion", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const text = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise<void>((resolve) => Reflect.set(window, "releaseSyntheticWorkflowRead", resolve));
      return text.call(this);
    };
  });
  await importWorkflow(page, await config());
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseSyntheticWorkflowRead"))).toBe("function");
  await page.getByRole("button", { name: "New conversion", exact: true }).click();
  await page.evaluate(() => Reflect.get(window, "releaseSyntheticWorkflowRead")());
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Edit workflow", exact: true })).not.toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /imported as an unsaved draft/ })).not.toBeVisible();
});

test("opening a workflow resets formula permission and added output IDs remain unique", async ({ page }) => {
  const definition = JSON.parse(await config());
  definition.fields[0].id = "manual-0";
  definition.fields[1].recipe.value.text = "=SYNTHETIC()";
  await page.goto("/"); await importWorkflow(page, JSON.stringify(definition));
  await source(page, "Order,Consignee\n000011,Depot"); await preview(page);
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  await page.getByRole("radio", { name: "Preserve raw text for TMS import — do not open in spreadsheets" }).check();
  expect((await download(page)).toString()).toContain("=SYNTHETIC()");
  await page.getByRole("button", { name: "Edit workflow", exact: true }).click();
  const { add, map } = await import("./helpers");
  await add(page, ["Additional"]); await map(page, "Additional", "order"); await preview(page);
  await page.getByRole("radio", { name: "Preserve raw text for TMS import — do not open in spreadsheets" }).check();
  const json = await backup(page);
  const ids = JSON.parse(json).fields.map((field: {id: string}) => field.id);
  expect(new Set(ids).size).toBe(6); expect(ids).toContain("manual-0");
  page.once("dialog", (dialog) => dialog.accept());
  await importWorkflow(page, json);
  await source(page, "Order,Consignee\n000012,Depot"); await preview(page);
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  await page.getByRole("radio", { name: "Escape risky text with an apostrophe" }).check();
  expect((await download(page)).toString()).toContain("'=SYNTHETIC()");
});

test("a delayed workflow read confirms against the current newly uploaded source", async ({ page }) => {
  await page.goto("/"); await importWorkflow(page, await config());
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const id = await page.getByLabel("Saved workflows", { exact: true }).inputValue();
  await page.reload(); await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await expect(page.getByRole("region", { name: "Repeat workflow", exact: true })).toBeVisible();
  await expect(page.getByLabel("Upload source CSV")).toBeEnabled();
  await page.evaluate(() => {
    const text = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise<void>((resolve) => Reflect.set(window, "releaseSyntheticLateImport", resolve));
      return text.call(this);
    };
  });
  const replacement = { ...JSON.parse(await config()), id: "synthetic-late", name: "Late replacement" };
  await importWorkflow(page, JSON.stringify(replacement));
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseSyntheticLateImport"))).toBe("function");
  await source(page, "Order,Consignee\n000077,Current depot"); await preview(page);
  const previous = await download(page);
  let confirmations = 0;
  page.once("dialog", async (dialog) => { confirmations++; await dialog.dismiss(); });
  await page.evaluate(() => Reflect.get(window, "releaseSyntheticLateImport")());
  await expect.poll(() => confirmations).toBe(1);
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Synthetic fixed fields and trim");
  await expect(page.getByLabel("Full dataset counts")).toBeVisible();
  expect(await download(page)).toEqual(previous);
});
