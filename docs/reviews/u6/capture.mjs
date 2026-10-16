import { chromium, expect } from "@playwright/test";
import { writeFile, readFile } from "node:fs/promises";
const browser = await chromium.launch({ executablePath: process.env.U2_CHROMIUM_PATH || "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);
const errors = [], observations = [];
page.on("pageerror", (error) => errors.push(error.message));
const button = (name) => page.getByRole("button", { name, exact: true });
const label = (name) => page.getByLabel(name, { exact: true });
async function edit(header) { await button(`Edit ${header}`).click(); }
async function done() { await page.getByRole("dialog").getByRole("button", { name: "Done", exact: true }).click(); }
async function capture(state, width) {
  await page.setViewportSize({ width, height: 1000 });
  observations.push({ state, width, noPageOverflow: await page.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth), noDialogOverflow: await page.locator("dialog[open]").evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth)) });
  await page.screenshot({ path: `docs/reviews/u6/${state}-${width}.png`, fullPage: state === "workspace" });
}
try {
  await page.goto("http://127.0.0.1:4173/");
  await label("Upload source CSV").setInputFiles({ name: "synthetic-address.csv", mimeType: "text/csv", buffer: await readFile("tests/fixtures/addresses/source.csv") });
  await page.locator(".workspace").waitFor();
  await page.locator("details.bulk-columns summary").click();
  await page.getByLabel("New column names").fill("Street\nCity\nProvince\nPostal\nLabel"); await button("Add columns").click();
  for (const [index, header] of ["Street", "City", "Province", "Postal"].entries()) {
    await edit(header); await label("Split a source column").check();
    await label("Split source").selectOption("address");
    await label("Use segment number").fill(String(index + 1));
    await label("Trim whitespace around each segment").check(); await done();
  }
  await edit("Label"); await label("Combine sources and text").check();
  await label("Component 1 source").selectOption("id"); await label("Component 2 text").fill("Dock");
  await button("Add source component").click(); await label("Component 3 source").selectOption("empty");
  await label("Combination separator").fill(" | "); await done();
  await button("Download converted CSV").waitFor({ state: "visible" });
  await expect(button("Download converted CSV")).toBeEnabled();
  for (const width of [1440, 1024, 390]) await capture("workspace", width);
  await edit("City");
  for (const width of [1440, 390]) await capture("split-settings", width);
  await done(); await edit("Label");
  for (const width of [1440, 390]) await capture("combine-settings", width);
  await done();
  if (errors.length || observations.some((o) => !o.noPageOverflow || !o.noDialogOverflow)) throw new Error("UI error or overflow");
  await writeFile("docs/reviews/u6/capture.json", JSON.stringify({ browser: browser.version(), observations, errors }, null, 2) + "\n");
} finally { await browser.close(); }
