import { expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
export async function upload(page: Page, text: string, name = "synthetic.csv") {
  const source = page.getByLabel("Upload source CSV");
  await expect(source).toBeEnabled();
  await source.setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(text) });
  await expect(
    page.locator(".workspace"),
  ).toBeVisible();
  await expect(source).toBeEnabled();
}
export async function add(page: Page, headers: string[]) {
  const bulk = page.locator("details.bulk-columns");
  if ((await bulk.getAttribute("open")) === null)
    await bulk.locator("summary").click();
  await page.getByLabel("New column names").fill(headers.join("\n"));
  await page.getByRole("button", { name: "Add columns", exact: true }).click();
}
export async function edit(page: Page, header: string) {
  await page
    .getByRole("button", { name: `Edit ${header}`, exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: /column settings/ }),
  ).toBeVisible();
}
export async function closeSettings(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Done", exact: true })
    .click();
}
export async function fixed(
  page: Page,
  header: string,
  type: "text" | "number" | "blank",
  value = "",
) {
  await edit(page, header);
  await page.getByLabel("Use a fixed value", { exact: true }).check();
  await page.getByLabel("Fixed value type", { exact: true }).selectOption(type);
  if (type !== "blank")
    await page.getByLabel(type === "number" ? "Fixed number" : "Fixed text", { exact: true }).fill(value);
  await closeSettings(page);
}
export async function rename(page: Page, header: string, name: string) {
  await edit(page, header);
  await page.getByLabel("Output column name", { exact: true }).fill(name);
  await closeSettings(page);
}
export async function remove(page: Page, header: string) {
  await edit(page, header);
  await page
    .getByRole("button", { name: `Remove ${header}`, exact: true })
    .click();
}
export async function move(
  page: Page,
  header: string,
  direction: "up" | "down",
) {
  await edit(page, header);
  await page
    .getByRole("button", { name: `Move ${header} ${direction}`, exact: true })
    .click();
  await closeSettings(page);
}
export async function map(page: Page, header: string, source: string) {
  await page
    .locator(`.source-grid [data-source-key=${JSON.stringify(source)}]`)
    .click();
  await page
    .getByRole("button", { name: `Select output ${header}`, exact: true })
    .click();
}
// Performance setup uses real card click handlers without pointer scrolling overhead.
// Pointer actionability, native dragging and keyboard focus are covered separately.
export async function mapForPerformance(
  page: Page,
  header: string,
  source: string,
) {
  await page
    .locator(`.source-grid [data-source-key=${JSON.stringify(source)}]`)
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: `Select output ${header}`, exact: true })
    .dispatchEvent("click");
}
export async function preview(page: Page) {
  await expect(page.getByLabel("Full dataset counts")).toBeVisible();
}
export async function download(page: Page) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download converted CSV", exact: true })
    .click();
  const result = await pending;
  expect(result.suggestedFilename()).toBe("converted.csv");
  const path = await result.path();
  expect(path).not.toBeNull();
  return readFile(path!);
}
