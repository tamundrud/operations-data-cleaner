import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { upload, add, preview, edit, closeSettings } from "./helpers";
test("labelled keyboard controls, laptop/mobile layouts and automated accessibility", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await add(page, ["Reference"]);
  await edit(page, "Reference");
  const select = page.getByLabel("Copy source for Reference", { exact: true });
  await select.focus();
  await select.press("ArrowDown");
  await select.press("Enter");
  await select.selectOption("id");
  await closeSettings(page);
  await preview(page);
  const button = page.getByRole("button", { name: "Download converted CSV" });
  await button.focus();
  await expect(button).toBeFocused();
  for (const width of [1366, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

test("U3 fixed fields, CSV options and contextual trim controls remain accessible", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Try fixed fields example", exact: true }).click();
  await preview(page);
  for (const header of [undefined, "CustomerCode", "Consignee"]) {
    if (header) await edit(page, header);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
    if (header) await closeSettings(page);
  }
});

test("workflow metadata stays literal and keyboard collision cancellation restores focus", async ({ page }) => {
  const { readFile } = await import("node:fs/promises");
  const definition = JSON.parse(await readFile("examples/u3-workflow.json", "utf8"));
  definition.name = "<svg onload=alert(1)>Synthetic</svg>";
  definition.fields[0].header = "<img src=x onerror=alert(1)>";
  definition.fields[1].recipe.value.text = "<script>alert(1)</script>";
  const dialogs: string[] = [], diagnostics: string[] = [];
  page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  page.on("pageerror", (error) => diagnostics.push(error.message));
  await page.goto("/");
  const importFile = { name: "synthetic-metadata.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(definition)) };
  await page.getByLabel("Import workflow", { exact: true }).setInputFiles(importFile);
  await page.getByRole("button", { name: "Save workflow", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const id = await page.getByLabel("Saved workflows", { exact: true }).inputValue();
  await page.reload();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
  const open = page.getByRole("button", { name: "Open workflow", exact: true });
  await open.focus(); await page.keyboard.press("Enter");
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue(definition.name);
  await page.getByLabel("Import workflow", { exact: true }).setInputFiles(importFile);
  const save = page.getByRole("button", { name: "Save workflow", exact: true });
  await save.focus(); await page.keyboard.press("Enter");
  const conflict = page.getByRole("dialog", { name: "Workflow already exists" });
  await expect(conflict).toBeVisible();
  await expect(conflict.getByLabel("Replace target", { exact: true })).toBeFocused();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(conflict).not.toBeVisible(); await expect(save).toBeFocused();
  await page.getByLabel("Upload source CSV").setInputFiles({ name: "synthetic.csv", mimeType: "text/csv", buffer: Buffer.from("Order,Consignee\n000003,Depot") });
  await preview(page);
  expect(await page.locator("img, svg, script:not([src])").count()).toBe(0);
  expect(dialogs).toEqual([]); expect(diagnostics).toEqual([]);
});
