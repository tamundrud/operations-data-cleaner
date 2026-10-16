import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { add, closeSettings, download, edit, preview, splitField, upload } from "./helpers";

async function configure(page: Parameters<typeof add>[0]) {
  await add(page, ["Street", "City", "Province", "Postal", "Label"]);
  for (const [i, header] of ["Street", "City", "Province", "Postal"].entries()) await splitField(page, header, "address", i + 1);
  await edit(page, "Label");
  await page.getByLabel("Combine sources and text", { exact: true }).check();
  await page.getByLabel("Component 1 source", { exact: true }).selectOption("id");
  await page.getByLabel("Component 2 text", { exact: true }).fill("Dock");
  await page.getByRole("button", { name: "Add source component", exact: true }).click();
  await page.getByLabel("Component 3 source", { exact: true }).selectOption("empty");
  await page.getByLabel("Combination separator", { exact: true }).fill(" | ");
  await page.getByRole("button", { name: "Move component 2 up", exact: true }).click();
  await expect(page.getByLabel("Component 1 text", { exact: true })).toHaveValue("Dock");
  await page.getByRole("button", { name: "Move component 1 down", exact: true }).click();
  await closeSettings(page);
  await preview(page);
}
const expected = "Street,City,Province,Postal,Label\r\n123 Main St,Vancouver,BC,V5K 0A1,\"001234 | Dock | \"\r\n";

test("AC-03/04 contextual split/combine, saved reuse and fresh-context JSON preserve exact output", async ({ page, browser }) => {
  await page.goto("/");
  await upload(page, await readFile("tests/fixtures/addresses/source.csv", "utf8"));
  await configure(page);
  expect((await download(page)).toString()).toBe(expected);
  await expect(page.locator(".pair")).toHaveCount(5);
  await expect(page.locator(".source-grid [data-source-key=address]")).toContainText("Used in 4 outputs");
  await expect(page.locator(".source-grid [data-source-key=id]")).toContainText("Used in 1 output");
  await page.getByLabel("Workflow name", { exact: true }).fill("Synthetic address workflow");
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const saved = await page.getByLabel("Saved workflows", { exact: true }).inputValue();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  const file = await event, json = await readFile((await file.path())!, "utf8");
  expect(json).not.toMatch(/123 Main St|001234|synthetic.csv/);
  expect(JSON.parse(json).source.referencedHeaders).toEqual(["address", "id", "empty"]);
  await page.reload();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(saved);
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  const reordered = 'Empty,Extra, ADDRESS , ID \n,unused,"123 Main St, Vancouver, BC, V5K 0A1",001234';
  await upload(page, reordered);
  expect((await download(page)).toString()).toBe(expected);
  await expect(page.getByRole("heading", { name: "2. Match your columns", exact: true })).not.toBeVisible();
  const fresh = await browser.newContext({ baseURL: "http://127.0.0.1:4173", serviceWorkers: "block" });
  try {
    const next = await fresh.newPage(); await next.goto("/");
    await next.getByLabel("Import workflow", { exact: true }).setInputFiles({ name: "synthetic-u6.json", mimeType: "application/json", buffer: Buffer.from(json) });
    await upload(next, reordered);
    expect((await download(next)).toString()).toBe(expected);
    await upload(next, 'ID,Empty,Address renamed\n001234,,"a,b,c,d"');
    await expect(next.getByRole("alert")).toContainText("missing");
    await expect(next.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  } finally { await fresh.close(); }
});

test("strict count and optional empty slots show row/field errors and block invalid download", async ({ page }) => {
  await page.goto("/");
  await upload(page, 'Address\n"123 Main St, Vancouver, BC, V5K 0A1, extra"\n"123 Main St, BC, V5K 0A1"\n"123 Main St,,BC,V5K 0A1"');
  await add(page, ["Street"]);
  await splitField(page, "Street", "address", 1);
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.locator(".issues")).toContainText("Record 2, line 2: Street: expected 4 segments but found 5.");
  await expect(page.locator(".issues")).toContainText("Record 3, line 3: Street: expected 4 segments but found 3.");
  await expect(page.locator(".issues")).toContainText("Record 4, line 4: Street: required segment 2 is empty.");
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  await edit(page, "Street");
  await page.getByLabel("Segment 2 may be empty", { exact: true }).check();
  await closeSettings(page);
  await expect(page.getByLabel("Full dataset counts")).toContainText("Invalid");
  await upload(page, 'Address\n"123 Main St,,BC,V5K 0A1"');
  expect((await download(page)).toString()).toBe("Street\r\n123 Main St\r\n");
});

test("keyboard recipe controls retain paired-card ordering, literal-only combinations and mobile accessibility", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/"); await upload(page, "ID\n001234"); await add(page, ["Label"]);
  const editButton = page.getByRole("button", { name: "Edit Label", exact: true });
  await editButton.focus(); await page.keyboard.press("Enter");
  await page.getByLabel("Combine sources and text", { exact: true }).check();
  await page.getByLabel("Component 1 type", { exact: true }).selectOption("literal");
  await page.getByLabel("Component 1 text", { exact: true }).fill("0012");
  await page.getByLabel("Combination separator", { exact: true }).fill(";");
  await expect(page.getByRole("button", { name: "Remove component 1", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Add literal component", exact: true }).click();
  await page.getByLabel("Component 3 text", { exact: true }).fill("tail");
  await page.getByRole("button", { name: "Move component 3 up", exact: true }).click();
  await expect(page.getByLabel("Component 2 text", { exact: true })).toHaveValue("tail");
  await page.getByRole("button", { name: "Remove component 2", exact: true }).click();
  await expect(page.getByLabel("Component 3 type", { exact: true })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await closeSettings(page); await expect(editButton).toBeFocused();
  expect((await download(page)).toString()).toBe("Label\r\n0012;\r\n");
  expect(await page.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Unlink Label", exact: true }).click();
  await expect(page.getByRole("button", { name: "Select output Label", exact: true })).toContainText("Unmatched");
});

test("reducing split count removes obsolete optional positions visibly and keeps the recipe usable", async ({ page }) => {
  await page.goto("/"); await upload(page, 'Address\n"a,b,c"');
  await add(page, ["Street"]); await splitField(page, "Street", "address", 1);
  await edit(page, "Street");
  await page.getByLabel("Segment 4 may be empty", { exact: true }).check();
  await page.getByLabel("Expected segment count", { exact: true }).fill("3");
  await expect(page.getByRole("status").filter({ hasText: "Optional empty positions beyond the new segment count were removed." })).toBeVisible();
  await closeSettings(page);
  expect((await download(page)).toString()).toBe("Street\r\na\r\n");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  const file = await pending;
  expect(JSON.parse(await readFile((await file.path())!, "utf8")).fields[0].recipe.optionalEmpty).toEqual([]);
  await edit(page, "Street");
  await page.getByLabel("Use segment number", { exact: true }).fill("3");
  await page.getByLabel("Expected segment count", { exact: true }).fill("2");
  await expect(page.getByLabel("Use segment number", { exact: true })).toHaveValue("3");
  await page.getByLabel("Use segment number", { exact: true }).fill("2");
  await closeSettings(page);
  await upload(page, 'Address\n"a,b"');
  expect((await download(page)).toString()).toBe("Street\r\nb\r\n");
});
