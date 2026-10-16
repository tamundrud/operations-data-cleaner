import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import {
  add,
  calculation,
  closeSettings,
  download,
  edit,
  map,
  upload,
} from "./helpers";

test("AC-05/06/10 contextual calculations export exact bytes, save/reopen and portable reuse", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await upload(page, "ID,Units,Factor,Cases,A,B\n001234,24,4,15,0.1,0.2");
  await add(page, ["Reference", "Cases out", "Weight", "Sum"]);
  await map(page, "Reference", "id");
  await calculation(page, "Cases out", "units", "factor", "divide");
  await calculation(page, "Weight", "cases", "12", "multiply", true);
  await calculation(page, "Sum", "a", "b", "add");
  const expected = "Reference,Cases out,Weight,Sum\r\n001234,6,180,0.3\r\n";
  expect((await download(page)).toString()).toBe(expected);
  await expect(page.locator(".pair")).toHaveCount(4);
  await edit(page, "Cases out");
  await page.getByLabel("Require whole numbers before rounding").check();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await closeSettings(page);
  await expect(
    page.getByRole("button", { name: "Edit Cases out", exact: true }),
  ).toBeFocused();
  const workflowName = page.getByLabel("Workflow name", { exact: true });
  await workflowName.scrollIntoViewIfNeeded();
  await workflowName.fill("Synthetic U7");
  await expect(workflowName).toHaveValue("Synthetic U7");
  await page
    .getByRole("button", { name: "Save workflow", exact: true })
    .click();
  await expect(
    page.getByText("Saved in this browser.", { exact: true }),
  ).toBeVisible();
  const id = await page
    .getByLabel("Saved workflows", { exact: true })
    .inputValue();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download workflow", exact: true })
    .click();
  const json = await readFile((await (await event).path())!, "utf8");
  expect(json).not.toContain("001234");
  await page.reload();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
  await page
    .getByRole("button", { name: "Open workflow", exact: true })
    .click();
  await upload(
    page,
    "B,Extra,Factor,ID,Cases,Units,A\n0.2,x,4,001234,15,24,0.1",
  );
  expect((await download(page)).toString()).toBe(expected);
  const fresh = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    serviceWorkers: "block",
  });
  try {
    const next = await fresh.newPage();
    await next.goto("/");
    await next.getByLabel("Import workflow", { exact: true }).setInputFiles({
      name: "u7.json",
      mimeType: "application/json",
      buffer: Buffer.from(json),
    });
    await upload(next, "Units,Factor,Cases,A,B,ID\n24,4,15,0.1,0.2,001234");
    expect((await download(next)).toString()).toBe(expected);
  } finally {
    await fresh.close();
  }
});

test("errors stay visible, rounding is explicit, and fractional cases fail before rounding", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "Units,Factor\n1,3\n24,0\n24,\n24,4 kg");
  await add(page, ["Cases"]);
  await calculation(page, "Cases", "units", "factor", "divide");
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.locator(".issues")).toContainText(
    "Nonterminating division",
  );
  await expect(page.locator(".issues")).toContainText("Cannot divide by zero");
  await expect(page.locator(".issues")).toContainText("operand is missing");
  await expect(page.locator(".issues")).toContainText("plain decimal");
  await expect(
    page.getByRole("button", { name: "Download converted CSV", exact: true }),
  ).toBeDisabled();
  await upload(page, "Units,Factor\n1,3");
  await edit(page, "Cases");
  await page.getByLabel("Rounding", { exact: true }).selectOption("half-even");
  await page.getByLabel("Rounding decimal places", { exact: true }).fill("2");
  await closeSettings(page);
  expect((await download(page)).toString()).toBe("Cases\r\n0.33\r\n");
  await edit(page, "Cases");
  await page.getByLabel("Require whole numbers before rounding").check();
  await page.getByLabel("Rounding decimal places", { exact: true }).fill("0");
  await closeSettings(page);
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.locator(".issues")).toContainText(
    "whole number before rounding",
  );
  await expect(
    page.getByRole("button", { name: "Download converted CSV", exact: true }),
  ).toBeDisabled();
});

test("mobile calculation settings, output type switches and keyboard focus preserve paired cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await upload(page, "A,B\n-1.245,0");
  await add(page, ["Number"]);
  await calculation(page, "Number", "a", "b", "add");
  await edit(page, "Number");
  await page.getByLabel("Rounding", { exact: true }).selectOption("half-up");
  await page
    .getByLabel("Maximum decimal places (optional)", { exact: true })
    .fill("2");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await closeSettings(page);
  await expect(
    page.getByRole("button", { name: "Edit Number", exact: true }),
  ).toBeFocused();
  expect((await download(page)).toString()).toBe("Number\r\n-1.25\r\n");
  expect(
    await page
      .locator("html")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await edit(page, "Number");
  await page.getByLabel("Copy a source column", { exact: true }).check();
  await page
    .getByLabel("Copy source for Number", { exact: true })
    .selectOption("a");
  await closeSettings(page);
  await page.getByLabel(/Preserve raw text for TMS import/).check();
  expect((await download(page)).toString()).toBe("Number\r\n-1.245\r\n");
});

test("numeric copy validation and precision edits renew CSV safety decisions", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "Reference,Quantity\n=1+1,1.234");
  await add(page, ["Reference", "Number"]);
  await map(page, "Reference", "reference");
  await map(page, "Number", "quantity");
  await edit(page, "Number");
  await page
    .getByRole("combobox", { name: "Output type", exact: true })
    .selectOption("number");
  await page
    .getByLabel("Maximum decimal places (optional)", { exact: true })
    .fill("2");
  await closeSettings(page);
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.locator(".issues")).toContainText(
    "exceeds the maximum of 2 decimal places",
  );
  await edit(page, "Number");
  await page.getByLabel("Rounding", { exact: true }).selectOption("truncate");
  await closeSettings(page);
  await page.getByLabel(/Preserve raw text for TMS import/).check();
  expect((await download(page)).toString()).toBe(
    "Reference,Number\r\n=1+1,1.23\r\n",
  );
  await edit(page, "Number");
  await page.getByLabel("Rounding decimal places", { exact: true }).fill("1");
  await closeSettings(page);
  await expect(
    page.getByRole("button", { name: "Download converted CSV", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel(/Preserve raw text for TMS import/),
  ).not.toBeChecked();
  await page.getByLabel(/Preserve raw text for TMS import/).check();
  expect((await download(page)).toString()).toBe(
    "Reference,Number\r\n=1+1,1.2\r\n",
  );
  await edit(page, "Number");
  await page
    .getByRole("combobox", { name: "Output type", exact: true })
    .selectOption("text");
  await closeSettings(page);
  await page.getByLabel(/Preserve raw text for TMS import/).check();
  expect((await download(page)).toString()).toBe(
    "Reference,Number\r\n=1+1,1.234\r\n",
  );
});

for (const initiallyMapped of [false, true]) {
  test(`numeric copy source retains rules when ${initiallyMapped ? "replacing" : "first choosing"} a source`, async ({
    page,
  }) => {
    await page.goto("/");
    await upload(page, "Original,Replacement,Bad\n2,1.5,four");
    await add(page, ["Cases"]);
    if (initiallyMapped) await map(page, "Cases", "original");
    await edit(page, "Cases");
    await page
      .getByRole("combobox", { name: "Output type", exact: true })
      .selectOption("number");
    await page.getByLabel("Require whole numbers before rounding").check();
    await page
      .getByLabel("Maximum decimal places (optional)", { exact: true })
      .fill("0");
    await page.getByLabel("Rounding", { exact: true }).selectOption("half-up");
    await page.getByLabel("Rounding decimal places", { exact: true }).fill("0");
    if (!initiallyMapped) {
      await page
        .getByLabel("Copy source for Cases", { exact: true })
        .selectOption("original");
      await expect(
        page.getByRole("combobox", { name: "Output type", exact: true }),
      ).toHaveValue("number");
    }
    await page
      .getByLabel("Copy source for Cases", { exact: true })
      .selectOption("replacement");
    await expect(
      page.getByRole("combobox", { name: "Output type", exact: true }),
    ).toHaveValue("number");
    await expect(
      page.getByLabel("Require whole numbers before rounding"),
    ).toBeChecked();
    await expect(
      page.getByLabel("Maximum decimal places (optional)", { exact: true }),
    ).toHaveValue("0");
    await expect(page.getByLabel("Rounding", { exact: true })).toHaveValue(
      "half-up",
    );
    await expect(
      page.getByLabel("Rounding decimal places", { exact: true }),
    ).toHaveValue("0");
    await closeSettings(page);
    await page.getByLabel("Show only rows with exceptions").check();
    await expect(page.locator(".issues")).toContainText(
      "whole number before rounding",
    );
    await expect(
      page.getByRole("button", { name: "Download converted CSV", exact: true }),
    ).toBeDisabled();
    await edit(page, "Cases");
    await page
      .getByLabel("Copy source for Cases", { exact: true })
      .selectOption("bad");
    await expect(
      page.getByRole("combobox", { name: "Output type", exact: true }),
    ).toHaveValue("number");
    await closeSettings(page);
    await page.getByLabel("Show only rows with exceptions").check();
    await expect(page.locator(".issues")).toContainText("plain decimal");
    await expect(
      page.getByRole("button", { name: "Download converted CSV", exact: true }),
    ).toBeDisabled();
  });
}
