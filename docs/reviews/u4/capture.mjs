import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const directory = "docs/reviews/u4";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const observations = [];
try {
  await page.goto("http://127.0.0.1:4173/");
  await page.getByRole("button", { name: "Try fixed fields example", exact: true }).click();
  await page.getByRole("button", { name: "Download converted CSV", exact: true }).waitFor({ state: "visible" });
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    observations.push({ state: "editor", width, noPageOverflow: await page.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth) });
    await page.screenshot({ path: `${directory}/editor-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel("Workflow name", { exact: true }).fill("Fictional order conversion");
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await page.getByText("Keep a portable backup.", { exact: true }).waitFor();
  await page.screenshot({ path: `${directory}/backup-prompt-1440.png`, fullPage: true });
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.screenshot({ path: `${directory}/backup-prompt-1024.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  const id = await page.getByLabel("Saved workflows", { exact: true }).inputValue();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Import workflow", { exact: true }).setInputFiles("examples/u3-workflow.json");
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await page.getByRole("dialog", { name: "Workflow already exists" }).waitFor();
  await page.screenshot({ path: `${directory}/collision-1440.png`, fullPage: true });
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.screenshot({ path: `${directory}/collision-1024.png`, fullPage: true });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await page.getByLabel("Upload source CSV").setInputFiles("examples/u3-source.csv");
  await page.getByLabel("Full dataset counts").waitFor();
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    observations.push({ state: "repeat", width, noPageOverflow: await page.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth) });
    await page.screenshot({ path: `${directory}/repeat-${width}.png`, fullPage: true });
  }
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download converted CSV", exact: true }).click();
  const download = await event;
  observations.push({ download: download.suggestedFilename(), errors });
  if (errors.length || observations.some((item) => item.noPageOverflow === false)) throw new Error("U4 capture found errors or overflow");
  await writeFile(`${directory}/capture.json`, JSON.stringify(observations, null, 2) + "\n");
} finally { await browser.close(); }
