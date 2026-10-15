import { test, expect } from "@playwright/test";
import {
  upload,
  add,
  map,
  preview,
  download,
  mapForPerformance,
  fixed,
  edit,
  closeSettings,
} from "./helpers";
import Papa from "papaparse";
import { readFile } from "node:fs/promises";
test("10000 U3 rows preserve every fixed value, exact decimal, trim result and original reference", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await upload(page, "ID,Name\r\n" + Array.from({ length: 10000 }, (_, i) => `${String(i).padStart(6, "0")},  Dock  ${i}  `).join("\r\n"));
  await add(page, ["Reference", "CustomerCode", "Weight", "Blank", "Name"]);
  await map(page, "Reference", "id");
  await fixed(page, "CustomerCode", "text", "0012");
  await fixed(page, "Weight", "number", "12.50");
  await fixed(page, "Blank", "blank");
  await map(page, "Name", "name");
  await edit(page, "Name");
  await page.getByLabel("Remove leading and trailing whitespace").check();
  await closeSettings(page);
  await page.getByLabel("CSV delimiter", { exact: true }).selectOption("\t");
  await page.getByLabel("Include UTF-8 BOM").check();
  await preview(page);
  const bytes = await download(page);
  expect(bytes.subarray(0, 3)).toEqual(Buffer.from([239, 187, 191]));
  const rows = Papa.parse<string[]>(bytes.toString(), { delimiter: "\t", skipEmptyLines: true }).data;
  expect(rows[0]).toEqual(["Reference", "CustomerCode", "Weight", "Blank", "Name"]);
  expect(rows).toHaveLength(10001);
  for (let i = 0; i < 10000; i++)
    expect(rows[i + 1]).toEqual([String(i).padStart(6, "0"), "0012", "12.50", "", `Dock  ${i}`]);
  await expect(page.getByLabel("Full dataset counts")).toContainText("10000");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByRole("region", { name: "Output preview, scroll horizontally" }).getByRole("rowheader").first()).toHaveText("52 / 52");
});
test("10000 x 20 rows remain intact; record cold and five warm full-pipeline runs", async ({
  page,
  browserName,
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  const headers = Array.from({ length: 20 }, (_, i) => `Col${i}`);
  const csv =
    headers.join(",") +
    "\r\n" +
    Array.from({ length: 10000 }, (_, r) =>
      headers
        .map((_, c) =>
          c === 0 ? String(r).padStart(6, "0") : `synthetic-${r}-${c}`,
        )
        .join(","),
    ).join("\r\n") +
    "\r\n";
  const timings: number[] = [];
  await page.goto("/");
  for (let i = 0; i < 6; i++) {
    const start = performance.now();
    await upload(page, csv);
    if (i === 0) {
      await page.clock.install();
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      await add(page, headers);
      for (const h of headers)
        await mapForPerformance(page, h, h.toLowerCase());
      await page.clock.runFor(250);
      await preview(page);
      await page.clock.resume();
    }
    const bytes = await download(page);
    const elapsed = performance.now() - start;
    // Trial 0 includes manual setup, reported separately; repeats exercise the active mappings.
    timings.push(elapsed);
    const records = Papa.parse<string[]>(bytes.toString(), {
      skipEmptyLines: true,
    }).data;
    expect(records.length).toBe(10001);
    expect(records[1][0]).toBe("000000");
    expect(records[10000][19]).toBe("synthetic-9999-19");
    expect(bytes).toEqual(Buffer.from(csv));
    expect(bytes.subarray(0, 3)).not.toEqual(Buffer.from([239, 187, 191]));
    await expect(page.getByLabel("Full dataset counts")).toContainText("10000");
    if (i === 0) {
      await page.getByLabel("Workflow name", { exact: true }).fill("Synthetic 10000-row repeat");
      await page.getByRole("button", { name: "Save workflow", exact: true }).click();
      await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
      const id = await page.getByLabel("Saved workflows", { exact: true }).inputValue();
      await page.reload();
      await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
      await page.getByRole("button", { name: "Open workflow", exact: true }).click();
    }
  }
  const warm = timings.slice(1).sort((a, b) => a - b);
  await testInfo.attach("timings.json", {
    body: JSON.stringify(
      {
        browserName,
        version: browser.version(),
        rows: 10000,
        columns: 20,
        coldIncludingManualSetupMs: timings[0],
        warmMs: timings.slice(1),
        medianMs: warm[2],
        worstMs: warm[4],
        environment: "Codex cloud runner; not reference laptop qualification",
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(warm[4]).toBeLessThan(5000);
  const backupEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  const backup = await backupEvent;
  const portable = await readFile((await backup.path())!);
  const fresh = await browser.newContext({ baseURL: "http://127.0.0.1:4173", serviceWorkers: "block" });
  try {
    const next = await fresh.newPage(); await next.goto("/");
    await next.getByLabel("Import workflow", { exact: true }).setInputFiles({ name: "synthetic-large-workflow.json", mimeType: "application/json", buffer: portable });
    await upload(next, csv);
    expect(await download(next)).toEqual(Buffer.from(csv));
    await expect(next.getByLabel("Full dataset counts")).toContainText("10000");
  } finally { await fresh.close(); }
});
test("busy cancel and retry preserve the active mapping and full downloaded data", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await preview(page);
  // Hold only the replacement read until the real cancellation action completes.
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = async function () {
      if (this.name === "replacement.csv")
        await new Promise<void>((resolve) => {
          Reflect.set(window, "releaseSyntheticRead", resolve);
        });
      return original.call(this);
    };
  });
  await page.getByLabel("Upload source CSV").setInputFiles({
    name: "replacement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("ID\n009999"),
  });
  const cancel = page.getByRole("button", { name: "Cancel processing" });
  await expect(cancel).toBeVisible();
  const start = performance.now();
  await cancel.click();
  await page.evaluate(() => Reflect.get(window, "releaseSyntheticRead")?.());
  await expect(page.getByRole("alert")).toContainText("cancelled");
  expect(performance.now() - start).toBeLessThan(1000);
  await page.getByRole("button", { name: "Retry active file" }).click();
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeEnabled();
  expect((await download(page)).toString()).toBe("Reference\r\n001234\r\n");
});

test("cancellation terminates an active parsing worker and retries the original file", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await preview(page);
  const csv =
    ["ID", ...Array.from({ length: 19 }, (_, i) => `X${i}`)].join(",") +
    "\n" +
    Array.from(
      { length: 90000 },
      (_, i) =>
        `${String(i).padStart(6, "0")},${Array(19).fill("synthetic").join(",")}`,
    ).join("\n");
  await page.getByLabel("Upload source CSV").setInputFiles({
    name: "large-replacement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.locator(".status-bar [role=status]")).toContainText(
    "Importing and checking CSV",
  );
  await page.getByRole("button", { name: "Cancel processing" }).click();
  await expect(page.getByRole("alert")).toContainText("cancelled");
  await page.getByRole("button", { name: "Retry active file" }).click();
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeEnabled();
  expect((await download(page)).toString()).toBe("Reference\r\n001234\r\n");
});

test("499 x 20 import to preview stays under the one-second smoke budget", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  const headers = Array.from({ length: 20 }, (_, i) => `Col${i}`),
    csv =
      headers.join(",") +
      "\n" +
      Array.from({ length: 499 }, (_, r) =>
        headers
          .map((_, c) =>
            c === 0 ? String(r).padStart(6, "0") : `synthetic-${r}-${c}`,
          )
          .join(","),
      ).join("\n");
  const timings: number[] = [];
  await page.goto("/");
  for (let i = 0; i < 6; i++) {
    const start = performance.now();
    await upload(page, csv);
    const importMs = performance.now() - start;
    if (i === 0) {
      await page.clock.install();
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      await add(page, headers);
      for (const h of headers)
        await mapForPerformance(page, h, h.toLowerCase());
      const runStart = performance.now();
      await page.clock.runFor(250);
      await preview(page);
      timings.push(importMs + performance.now() - runStart);
      await page.clock.resume();
    } else timings.push(importMs);
    const records = Papa.parse<string[]>((await download(page)).toString(), {
      skipEmptyLines: true,
    }).data;
    expect(records.length).toBe(500);
    expect(records[499][19]).toBe("synthetic-498-19");
  }
  const warm = timings.slice(1).sort((a, b) => a - b);
  await testInfo.attach("small-timings.json", {
    body: JSON.stringify(
      {
        browserName,
        version: browser.version(),
        rows: 499,
        columns: 20,
        coldImportPlusEvaluationExcludingManualMappingMs: timings[0],
        warmImportThroughPreviewMs: timings.slice(1),
        medianMs: warm[2],
        worstMs: warm[4],
        environment:
          "cloud runner; UI automation overhead included; reference laptop pending",
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(warm[4]).toBeLessThan(1000);
});
