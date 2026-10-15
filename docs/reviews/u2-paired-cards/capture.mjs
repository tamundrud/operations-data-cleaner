// Capture the production UI with the same synthetic fixture as the approved prototype.
import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
const browser = await chromium.launch({
  executablePath: process.env.U2_CHROMIUM_PATH,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4173");
const upload = async (headers, values) => {
  await page
    .getByLabel("Upload source CSV")
    .setInputFiles({
      name: "synthetic-orders.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        headers.join(",") +
          "\n" +
          values
            .map((row) =>
              row.map((s) => '"' + s.replaceAll('"', '""') + '"').join(","),
            )
            .join("\n"),
      ),
    });
  await expect(
    page.getByRole("heading", { name: "2. Match your columns", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Upload source CSV")).toBeEnabled();
};
const add = async (names) => {
  await page.locator(".bulk-columns summary").click();
  await page.getByLabel("New column names").fill(names.join("\n"));
  await page.getByRole("button", { name: "Add columns", exact: true }).click();
  await page.locator(".bulk-columns summary").click();
};
const match = async (source, output) => {
  await page
    .getByRole("button", { name: "Select source " + source, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select output " + output, exact: true })
    .click();
};
await upload(
  ["PO #", "Ship To", "Notes", "Cases", "Requested Date", "Service"],
  [
    [
      "001234",
      "Northwind, Depot",
      "Use side door",
      "24",
      "10/08/2026",
      "Standard",
    ],
    ["000007", "Maple Yard", "  Keep spaces  ", "15", "10/09/2026", "Express"],
    [
      "001245",
      "Example Warehouse",
      "Call on arrival",
      "8",
      "10/09/2026",
      "Standard",
    ],
    ["000082", "Cedar Depot", "Ring bell", "10", "10/10/2026", "Standard"],
  ],
);
await add([
  "Reference",
  "Consignee",
  "Delivery Notes",
  "Quantity",
  "Delivery Date",
  "Service Type",
]);
await match("PO #", "Reference");
await match("Ship To", "Consignee");
await match("Cases", "Quantity");
await expect(page.getByLabel("Full dataset counts")).toBeVisible();
for (const width of [1440, 1024]) {
  await page.setViewportSize({ width, height: 1000 });
  await page
    .locator(".matched-scroll, .source-grid, .dest-list")
    .evaluateAll((nodes) =>
      nodes.forEach((node) => {
        node.scrollTop = 0;
      }),
    );
  await page.mouse.move(0, 0);
  await page.screenshot({ path: root + `sample-${width}.png`, fullPage: true });
}
await page.getByRole("button", { name: "End session" }).click();
const headers = Array.from({ length: 25 }, (_, i) => `Source ${i + 1}`),
  outputs = Array.from({ length: 30 }, (_, i) => `Output ${i + 1}`);
await upload(headers, [
  headers.map((_, i) => `00${i}`),
  headers.map((_, i) => `01${i}`),
]);
await add(outputs);
for (let i = 0; i < 10; i++) await match(headers[i], outputs[i]);
await expect(page.getByLabel("Full dataset counts")).toBeVisible();
for (const width of [1440, 1024]) {
  await page.setViewportSize({ width, height: 900 });
  await page
    .locator(".matched-scroll, .source-grid, .dest-list")
    .evaluateAll((nodes) =>
      nodes.forEach((node) => {
        node.scrollTop = 0;
      }),
    );
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: root + `25-sources-30-outputs-${width}.png`,
    fullPage: true,
  });
}
expect(errors).toEqual([]);
console.log(
  JSON.stringify({ errors, browser: browser.version(), screenshots: 4 }),
);
await browser.close();
