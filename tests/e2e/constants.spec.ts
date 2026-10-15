import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { add, closeSettings, download, edit, fixed, map, preview, upload } from "./helpers";

test("U3 sample demonstrates constants, trim and nondefault CSV settings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try fixed fields example", exact: true }).click();
  await preview(page);
  expect(await download(page)).toEqual(await readFile("examples/u3-expected.csv"));
  await expect(page.getByLabel("CSV delimiter", { exact: true })).toHaveValue(";");
  await expect(page.getByLabel("Include UTF-8 BOM")).toBeChecked();
  await expect(page.getByLabel("Include header row")).not.toBeChecked();
  await expect(page.locator(".matched-scroll")).toContainText("No source needed");
});

test("fixed fields complete without sources, trim validates resulting text and reorder preserves values", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");
  await upload(page, 'ID,Name\r\n001,"  A  B  "\r\n002,"  C  D  "\r\n');
  await add(page, ["CustomerCode", "Weight", "Blank", "Name"]);
  await fixed(page, "CustomerCode", "text", "0012");
  await fixed(page, "Weight", "number", "12.50");
  await fixed(page, "Blank", "blank");
  await map(page, "Name", "name");
  await expect(page.locator(".matched-scroll .pair")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Select output Weight", exact: true })).toContainText("12.50");
  await expect(page.locator(".source-grid")).not.toContainText("Used in 2");
  await preview(page);
  expect((await download(page)).toString()).toBe('CustomerCode,Weight,Blank,Name\r\n0012,12.50,,"  A  B  "\r\n0012,12.50,,"  C  D  "\r\n');
  await edit(page, "Name");
  await page.locator(".column-validation summary").click();
  await page.getByLabel("Required value", { exact: true }).check();
  await page.getByLabel("Maximum characters", { exact: true }).fill("4");
  await closeSettings(page);
  await preview(page);
  await expect(page.getByRole("button", { name: "Download converted CSV" })).toBeDisabled();
  await edit(page, "Name");
  await page.getByLabel("Remove leading and trailing whitespace", { exact: true }).check();
  await closeSettings(page);
  await preview(page);
  await expect(page.getByRole("cell", { name: "A B", exact: true })).toHaveText("A  B");
  await page.locator(".source-inspection summary").click();
  expect(await page.getByRole("region", { name: "Source table, scroll horizontally" }).getByRole("cell").nth(1).textContent()).toBe("  A  B  ");
  await page.getByRole("button", { name: "Reorder pair Weight", exact: true }).press("Alt+ArrowUp");
  await preview(page);
  expect((await download(page)).toString()).toBe("Weight,CustomerCode,Blank,Name\r\n12.50,0012,,A  B\r\n12.50,0012,,C  D\r\n");
  await page.getByRole("button", { name: "Reorder pair Weight", exact: true }).dragTo(page.locator(".pair").last());
  await preview(page);
  expect((await download(page)).toString()).toBe("CustomerCode,Blank,Name,Weight\r\n0012,,A  B,12.50\r\n0012,,C  D,12.50\r\n");
  // An explicit source match replaces a numeric constant and returns to text copy semantics.
  await map(page, "Weight", "id");
  await preview(page);
  expect((await download(page)).toString()).toContain("0012,,A  B,001\r\n");
  await fixed(page, "Weight", "number", "-12.50");
  await preview(page);
  expect((await download(page)).toString()).toContain("0012,,A  B,-12.50\r\n");
});

test("constant reorder permutes configured slots while unmatched outputs stay fixed", async ({ page }) => {
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["Fixed", "Gap", "Copy"]);
  await fixed(page, "Fixed", "text", "0012");
  await map(page, "Copy", "id");
  const constant = page.locator(".pair").filter({ has: page.getByRole("button", { name: "Select output Fixed", exact: true }) });
  await expect(constant.locator("[data-source-key]")).toHaveCount(0);
  await expect(constant.locator(".pair-mark")).toHaveText("");
  await page.getByRole("button", { name: "Reorder pair Copy", exact: true }).press("Alt+ArrowUp");
  expect(await page.locator(".order-chip").allTextContents()).toEqual(["1 · Copy", "2 · Gap", "3 · Fixed"]);
  await page.getByRole("button", { name: "Reorder pair Fixed", exact: true }).dragTo(page.locator(".pair").first());
  expect(await page.locator(".order-chip").allTextContents()).toEqual(["1 · Fixed", "2 · Gap", "3 · Copy"]);
  await map(page, "Gap", "id");
  await preview(page);
  expect((await download(page)).toString()).toBe("Fixed,Gap,Copy\r\n0012,001234,001234\r\n");
});

test("intentional required blanks and invalid numeric literals block export with actionable errors", async ({ page }) => {
  await page.goto("/");
  await upload(page, "ID\na\nb");
  await add(page, ["Blank"]);
  await fixed(page, "Blank", "blank");
  await preview(page);
  expect((await download(page)).toString()).toBe("Blank\r\n\r\n\r\n");
  await edit(page, "Blank");
  await page.locator(".column-validation summary").click();
  await page.getByLabel("Required value", { exact: true }).check();
  await closeSettings(page);
  await preview(page);
  await expect(page.locator(".counts")).toContainText("Invalid 2");
  await expect(page.getByRole("button", { name: "Download converted CSV" })).toBeDisabled();
  await fixed(page, "Blank", "number", "1e3");
  await preview(page);
  await expect(page.locator(".review [role=alert]")).toContainText("Workflow structure is invalid");
  await fixed(page, "Blank", "number", "12.50");
  await preview(page);
  expect((await download(page)).toString()).toBe("Blank\r\n12.50\r\n12.50\r\n");
});

test("all twelve CSV setting combinations download independent exact UTF-8 byte goldens", async ({ page }) => {
  await page.goto("/");
  await upload(page, 'ID,Note\r\n0012,"café,;\t""Dock""\nNorth\r\nSouth"\r\n');
  await add(page, ["Note", "Reference"]);
  await map(page, "Note", "note");
  await map(page, "Reference", "id");
  await preview(page);
  for (const delimiter of [",", ";", "\t"]) {
    for (const bom of [false, true]) {
      for (const header of [false, true]) {
        await page.getByLabel("CSV delimiter", { exact: true }).selectOption(delimiter);
        await page.getByLabel("Include UTF-8 BOM", { exact: true }).setChecked(bom);
        await page.getByLabel("Include header row", { exact: true }).setChecked(header);
        await preview(page);
        const expected = (bom ? "\ufeff" : "") + (header ? `Note${delimiter}Reference\r\n` : "") + `"café,;\t""Dock""\nNorth\r\nSouth"${delimiter}0012\r\n`;
        expect(await download(page)).toEqual(Buffer.from(expected));
      }
    }
  }
});

test("formula constants require renewed choice after constant, trim and every export setting edit", async ({ page }) => {
  await page.goto("/");
  await upload(page, "ID\na");
  await add(page, ["Code"]);
  await fixed(page, "Code", "text", " =1+1 ");
  await preview(page);
  const button = page.getByRole("button", { name: "Download converted CSV" });
  const safe = page.getByLabel("Escape risky text with an apostrophe");
  await expect(button).toBeDisabled();
  await safe.check();
  expect((await download(page)).toString()).toBe('Code\r\n"\' =1+1 "\r\n');
  await page.getByLabel("Preserve raw text for TMS import", { exact: false }).check();
  expect((await download(page)).toString()).toBe('Code\r\n" =1+1 "\r\n');
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (const action of [
    async () => { await fixed(page, "Code", "text", " =2+2 "); },
    async () => { await edit(page, "Code"); await page.getByLabel("Remove leading and trailing whitespace").check(); await closeSettings(page); },
    async () => { await page.getByLabel("CSV delimiter", { exact: true }).selectOption(";"); },
    async () => { await page.getByLabel("Include UTF-8 BOM").check(); },
    async () => { await page.getByLabel("Include header row").uncheck(); },
  ]) {
    await action();
    await expect(button).toBeDisabled();
    await page.clock.runFor(250);
    await preview(page);
    await expect(button).toBeDisabled();
    await expect(safe).not.toBeChecked();
    await safe.check();
  }
  expect(await download(page)).toEqual(Buffer.from("\ufeff'=2+2\r\n"));
});

test("constant and CSV edits during an older evaluation cannot export stale settings", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T00:00:00Z") });
  await page.addInitScript(() => {
    const runtime = Object.assign(window, { holdRuns: false, pendingRuns: [] as (() => void)[] });
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(message: unknown, options: Transferable[] | StructuredSerializeOptions = []) {
        const send = () => { if (Array.isArray(options)) super.postMessage(message, options); else super.postMessage(message, options); };
        if ((message as { kind?: string }).kind === "run" && runtime.holdRuns) runtime.pendingRuns.push(send);
        else send();
      }
    };
  });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-15T00:10:00Z"));
  await upload(page, "ID\na");
  await add(page, ["Code"]);
  await fixed(page, "Code", "text", "0012");
  await page.clock.runFor(250);
  await preview(page);
  await page.evaluate(() => Reflect.set(window, "holdRuns", true));
  await page.getByLabel("Include UTF-8 BOM").check();
  await page.clock.runFor(250);
  await expect(page.locator(".status-bar [role=status]")).toContainText("Checking all rows");
  await fixed(page, "Code", "text", "0099");
  await page.getByLabel("Include header row").uncheck();
  await page.evaluate(() => Reflect.get(window, "pendingRuns").shift()?.());
  await expect(page.getByLabel("Upload source CSV")).toBeEnabled();
  await expect(page.getByRole("button", { name: "Download converted CSV" })).toBeDisabled();
  await page.clock.runFor(250);
  await page.evaluate(() => Reflect.get(window, "pendingRuns").shift()?.());
  await preview(page);
  expect(await download(page)).toEqual(Buffer.from("\ufeff0099\r\n"));
});
