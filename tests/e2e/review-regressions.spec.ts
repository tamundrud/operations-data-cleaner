import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { upload, add, map, preview, download, remove } from "./helpers";
test("CE #1: removing a previewed field and repreviewing cannot render stale values", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await add(page, ["Reference", "Customer"]);
  await map(page, "Reference", "id");
  await map(page, "Customer", "name");
  await preview(page);
  await remove(page, "Customer");
  await preview(page);
  expect((await download(page)).toString()).toBe("Reference\r\n001234\r\n");
  expect(errors).toEqual([]);
});
test("CE #1: sample transaction replaces a wider completed preview", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["A", "B", "C", "D"]);
  for (const h of ["A", "B", "C", "D"]) await map(page, h, "id");
  await preview(page);
  await page.getByRole("button", { name: "Try sample data" }).click();
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeEnabled();
  expect(await download(page)).toEqual(
    await readFile("examples/u2/expected.csv"),
  );
  expect(errors).toEqual([]);
});
test("CE #4: failed sample read retains the prior active mapping and visible failure", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["My reference"]);
  await map(page, "My reference", "id");
  await preview(page);
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function () {
      return this.name === "synthetic-orders.csv"
        ? Promise.reject(new Error("synthetic read failure"))
        : original.call(this);
    };
  });
  await page.getByRole("button", { name: "Try sample data" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be read");
  await expect(
    page.getByRole("button", {
      name: "Select output My reference",
      exact: true,
    }),
  ).toContainText("My reference");
  expect((await download(page)).toString()).toBe("My reference\r\n001234\r\n");
});
test("CE #5: cancelled sample and active-file retry keep matching preview and output", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["My reference"]);
  await map(page, "My reference", "id");
  await preview(page);
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = async function () {
      if (this.name === "synthetic-orders.csv")
        await new Promise((r) => setTimeout(r, 600));
      return original.call(this);
    };
  });
  await page.getByRole("button", { name: "Try sample data" }).click();
  await page.getByRole("button", { name: "Cancel processing" }).click();
  await page.getByRole("button", { name: "Retry active file" }).click();
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", {
      name: "Select output My reference",
      exact: true,
    }),
  ).toContainText("My reference");
  expect((await download(page)).toString()).toBe("My reference\r\n001234\r\n");
});

test("new source upload requires a fresh CSV safety choice", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID\n=1+1");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await preview(page);
  await page.getByLabel("Escape risky text with an apostrophe").check();
  expect((await download(page)).toString()).toBe("Reference\r\n'=1+1\r\n");
  await upload(page, "ID\n=2+2");
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Escape risky text with an apostrophe"),
  ).not.toBeChecked();
  await page
    .getByLabel("Preserve raw text for TMS import", { exact: false })
    .check();
  expect((await download(page)).toString()).toBe("Reference\r\n=2+2\r\n");
});
