import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch(process.env.U2_CHROMIUM_PATH ? { executablePath: process.env.U2_CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const observations = [];
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:4173/");
  await page.getByLabel("Upload source CSV").setInputFiles({ name: "synthetic-orders.csv", mimeType: "text/csv", buffer: Buffer.from("Ship To,PO #,Bill To,Shipment ID\r\nFictional Depot,000123,Fictional Billing,S001\r\n") });
  await page.locator(".workspace").waitFor();
  await page.locator("details.bulk-columns summary").click();
  await page.getByLabel("New column names").fill("Consignee\nPurchase Order Reference\nStop ID");
  await page.getByRole("button", { name: "Add columns", exact: true }).click();
  await page.getByRole("button", { name: "Accept Ship To for Consignee", exact: true }).waitFor();
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    observations.push({ state: "suggested", width, noPageOverflow: await page.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth) });
    await page.screenshot({ path: `docs/reviews/u5/suggested-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Accept Ship To for Consignee", exact: true }).click();
  await page.getByRole("button", { name: "Reject PO # for Purchase Order Reference", exact: true }).click();
  await page.screenshot({ path: "docs/reviews/u5/confirmed-rejected-1440.png", fullPage: true });
  if (errors.length || observations.some((item) => !item.noPageOverflow)) throw new Error("UI errors or page overflow");
  await writeFile("docs/reviews/u5/capture.json", JSON.stringify({ observations, errors, browser: browser.version() }, null, 2) + "\n");
} finally { await browser.close(); }
