import { expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
export async function upload(page: Page, text: string, name = "synthetic.csv") {
  await page
    .getByLabel("Upload source CSV")
    .setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(text) });
  await expect(
    page.getByRole("heading", { name: "Source table", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Upload source CSV")).toBeEnabled();
}
export async function add(page: Page, headers: string[]) {
  await page.getByLabel("New column names").fill(headers.join("\n"));
  await page.getByRole("button", { name: "Add columns", exact: true }).click();
}
export async function map(page: Page, header: string, source: string) {
  await page
    .getByLabel(`Copy source for ${header}`, { exact: true })
    .selectOption(source);
}
export async function preview(page: Page) {
  await page
    .getByRole("button", { name: "Preview all rows", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Preview all rows", exact: true }),
  ).toBeEnabled();
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
