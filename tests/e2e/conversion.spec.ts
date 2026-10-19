import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  upload,
  add,
  map,
  preview,
  download,
  edit,
  closeSettings,
  rename,
  remove,
  move,
} from "./helpers";
test("upload template, keyboard map, rename, reorder, preview and verify actual bytes", async ({
  page,
}) => {
  await page.goto("/");
  await upload(
    page,
    'ID,Name,Unused\r\n001234," ACME, ""North""\nDock ",x\r\n',
  );
  await page
    .getByLabel("Upload destination CSV template")
    .setInputFiles("examples/u2/template.csv");
  await expect(
    page.getByRole("button", { name: "Select output Reference", exact: true }),
  ).toBeVisible();
  await map(page, "Reference", "id");
  await map(page, "Consignee", "name");
  await remove(page, "Delivery Notes");
  await rename(page, "Consignee", "Customer");
  await edit(page, "Customer");
  const selector = page.getByLabel("Copy source for Customer", { exact: true });
  await selector.focus();
  await expect(selector).toBeFocused();
  await selector.press("ArrowUp");
  await selector.press("ArrowDown");
  await selector.selectOption("name");
  await closeSettings(page);
  await move(page, "Customer", "up");
  await preview(page);
  expect((await download(page)).toString("utf8")).toBe(
    'Customer,Reference\r\n" ACME, ""North""\nDock ",001234\r\n',
  );
  // A draft edit cannot reuse the prior export or safety decision.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await rename(page, "Customer", "Renamed");
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await page.clock.runFor(250);
  await preview(page);
  expect((await download(page)).toString()).toContain("Renamed,Reference\r\n");
});
test("sample produces golden bytes without any customer file", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try sample data" }).click();
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeEnabled();
  expect(await download(page)).toEqual(
    await readFile("examples/u2/expected.csv"),
  );
});
test("unmapped and unacknowledged invalid rows block download, all exceptions are reachable", async ({
  page,
}) => {
  await page.goto("/");
  await upload(
    page,
    "ID,Other\n" +
      Array.from(
        { length: 120 },
        (_, i) => `${i === 119 ? "" : String(i).padStart(6, "0")},x`,
      ).join("\n"),
  );
  await add(page, ["Reference", "Extra"]);
  await map(page, "Reference", "id");
  await preview(page);
  await expect(
    page.getByText(
      "Extra is unmapped. Choose a source column or remove this output column.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await remove(page, "Extra");
  await edit(page, "Reference");
  await page.locator(".column-validation summary").click();
  await page.getByLabel("Required value").check();
  await closeSettings(page);
  await preview(page);
  await expect(
    page.getByLabel("Partial export review"),
  ).toBeVisible();
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(
    page.getByText("Record 121, line 121:", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await upload(page, "ID,Other\n001234,x");
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeEnabled();
  expect((await download(page)).toString()).toBe("Reference\r\n001234\r\n");
});
test("formula headers and text block export until explicit choice, representation matches bytes", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID\n=1+1");
  await add(page, ["=Header"]);
  await map(page, "=Header", "id");
  await preview(page);
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await page.getByLabel("Escape risky text with an apostrophe").check();
  await expect(
    page.getByRole("cell", { name: "'=1+1", exact: true }),
  ).toBeVisible();
  expect((await download(page)).toString()).toBe("'=Header\r\n'=1+1\r\n");
  await page
    .getByLabel("Preserve raw text for TMS import", { exact: false })
    .check();
  expect((await download(page)).toString()).toBe("=Header\r\n=1+1\r\n");
  await map(page, "=Header", "id");
  await preview(page);
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
});
test("failed replacement retains active file and valid mapping; ending session clears it", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await preview(page);
  await page.getByLabel("Upload source CSV").setInputFiles({
    name: "broken.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("ID,id\n1,2"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "duplicate source headers",
  );
  expect((await download(page)).toString()).toBe("Reference\r\n001234\r\n");
  await page.getByRole("button", { name: "End session" }).click();
  await expect(
    page.getByRole("heading", { name: "Source table", exact: true }),
  ).not.toBeVisible();
});
