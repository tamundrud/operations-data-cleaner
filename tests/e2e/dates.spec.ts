import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { add, closeSettings, download, edit, map, upload } from "./helpers";
async function dateField(
  page: Page,
  source = "MM/DD/YYYY",
  target = "YYYY-MM-DD",
) {
  await edit(page, "Delivery");
  await page.getByLabel("Output type", { exact: true }).selectOption("date");
  await expect(
    page.getByLabel("Source date format", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Output date format", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Source date format", { exact: true })
    .selectOption(source);
  await page
    .getByLabel("Output date format", { exact: true })
    .selectOption(target);
  await closeSettings(page);
}
test("AC-09 contextual dates, exact downloads, local reopen and portable timezone reuse", async ({
  page,
  browser,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await upload(page, "Date,ID\n10/08/2026,001234\n03/04/2026,0002\n,0003");
  await add(page, ["Delivery", "Reference"]);
  await map(page, "Delivery", "date");
  await map(page, "Reference", "id");
  await dateField(page);
  const expected =
    "Delivery,Reference\r\n2026-10-08,001234\r\n2026-03-04,0002\r\n,0003\r\n";
  expect((await download(page)).toString()).toBe(expected);
  await expect(page.locator(".pair")).toHaveCount(2);
  await expect(page.locator(".matching")).toContainText(
    "MM/DD/YYYY → YYYY-MM-DD",
  );
  await page.screenshot({
    path: info.outputPath("date-workspace.png"),
    fullPage: true,
  });
  await edit(page, "Delivery");
  await page
    .getByLabel("Output date format", { exact: true })
    .scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("date-settings-desktop.png") });
  await closeSettings(page);
  await expect(
    page.getByRole("button", { name: "Edit Delivery", exact: true }),
  ).toBeFocused();
  const workflowName = page.getByLabel("Workflow name", { exact: true });
  await workflowName.scrollIntoViewIfNeeded();
  await workflowName.fill("Synthetic U8");
  await expect(workflowName).toHaveValue("Synthetic U8");
  await page
    .getByRole("button", { name: "Save workflow", exact: true })
    .click();
  await expect(
    page.getByText("Saved in this browser.", { exact: true }),
  ).toBeVisible();
  const id = await page
    .getByLabel("Saved workflows", { exact: true })
    .inputValue();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download workflow", exact: true })
    .click();
  const json = await readFile((await (await pending).path())!, "utf8");
  expect(json).not.toMatch(/001234|10\/08\/2026|synthetic.csv/);
  await page.reload();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
  await page
    .getByRole("button", { name: "Open workflow", exact: true })
    .click();
  await upload(
    page,
    "ID,Unused,Date\n001234,x,10/08/2026\n0002,x,03/04/2026\n0003,x,",
  );
  expect((await download(page)).toString()).toBe(expected);
  for (const timezoneId of ["America/Los_Angeles", "Pacific/Kiritimati"]) {
    const fresh = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      serviceWorkers: "block",
      timezoneId,
    });
    try {
      const next = await fresh.newPage();
      await next.goto("/");
      await next.getByLabel("Import workflow", { exact: true }).setInputFiles({
        name: "u8.json",
        mimeType: "application/json",
        buffer: Buffer.from(json),
      });
      await upload(next, "Date,ID\n10/08/2026,001234\n03/04/2026,0002\n,0003");
      expect((await download(next)).toString()).toBe(expected);
    } finally {
      await fresh.close();
    }
  }
});
test("strict dates, optional/required blanks, explicit ambiguity and source replacement", async ({
  page,
}, info) => {
  await page.goto("/");
  await upload(
    page,
    "Date,Other,ID\n2024-02-29,03/04/2026,1\n2023-02-29,03/04/2026,2\n1900-02-29,03/04/2026,3\n2026-04-31,03/04/2026,4\n2026-10-08T12:00:00,03/04/2026,5\n,03/04/2026,6",
  );
  await add(page, ["Delivery"]);
  await map(page, "Delivery", "date");
  await dateField(page, "YYYY-MM-DD");
  await expect(page.getByLabel("Full dataset counts")).toContainText("4");
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.locator(".issues li")).toHaveCount(4);
  await expect(page.locator(".issues li").first()).toContainText(
    "real calendar date in YYYY-MM-DD",
  );
  await expect(
    page.getByRole("button", { name: "Download converted CSV", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: info.outputPath("date-errors.png"),
    fullPage: true,
  });
  await edit(page, "Delivery");
  await page.locator("details.column-validation summary").click();
  await page.getByLabel("Required value", { exact: true }).check();
  await closeSettings(page);
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.locator(".issues li")).toHaveCount(5);
  await expect(page.locator(".diagnostics li")).toHaveCount(9);
  await expect(page.getByLabel("Full dataset counts")).toContainText("Error issues 9");
  await expect(page.locator(".issues li").last()).toContainText(
    "required but blank",
  );
  await upload(page, "Date,Other,ID\n03/04/2026,10/08/2026,1");
  await edit(page, "Delivery");
  await page
    .getByLabel("Source date format", { exact: true })
    .selectOption("MM/DD/YYYY");
  await closeSettings(page);
  expect((await download(page)).toString()).toBe("Delivery\r\n2026-03-04\r\n");
  await edit(page, "Delivery");
  await page
    .getByLabel("Source date format", { exact: true })
    .selectOption("DD/MM/YYYY");
  await closeSettings(page);
  expect((await download(page)).toString()).toBe("Delivery\r\n2026-04-03\r\n");
  await edit(page, "Delivery");
  await page
    .getByLabel("Copy source for Delivery", { exact: true })
    .selectOption("other");
  await expect(page.getByLabel("Output type", { exact: true })).toHaveValue(
    "date",
  );
  await expect(
    page.getByLabel("Source date format", { exact: true }),
  ).toHaveValue("DD/MM/YYYY");
  await page
    .getByLabel("Output date format", { exact: true })
    .selectOption("MM/DD/YYYY");
  await closeSettings(page);
  expect((await download(page)).toString()).toBe("Delivery\r\n08/10/2026\r\n");
});
test("mobile date settings preserve layout and type changes clear incompatible rules and CSV acknowledgement", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await upload(page, "Date,Risk\n03/04/2026,=1+1");
  await add(page, ["Delivery", "Risk"]);
  await map(page, "Delivery", "date");
  await map(page, "Risk", "risk");
  await dateField(page);
  await page.getByLabel(/Preserve raw text for TMS import/).check();
  expect((await download(page)).toString()).toContain("2026-03-04");
  await edit(page, "Delivery");
  await page.screenshot({ path: info.outputPath("date-settings-mobile.png") });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByLabel("Output date format", { exact: true })
    .selectOption("DD/MM/YYYY");
  await closeSettings(page);
  await expect(
    page.getByLabel(/Preserve raw text for TMS import/),
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Download converted CSV", exact: true }),
  ).toBeDisabled();
  await page.getByLabel(/Preserve raw text for TMS import/).check();
  expect((await download(page)).toString()).toContain("04/03/2026");
  await edit(page, "Delivery");
  await page.getByLabel("Output type", { exact: true }).selectOption("text");
  await expect(
    page.getByLabel("Source date format", { exact: true }),
  ).toHaveCount(0);
  await closeSettings(page);
  await page.getByLabel(/Preserve raw text for TMS import/).check();
  expect((await download(page)).toString()).toContain("03/04/2026");
  expect(
    await page
      .locator("html")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});

test("date rules survive first source choice; fixed dates and trimming remain explicit", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "Date,ID\n 2024-02-29 ,1");
  await add(page, ["Delivery"]);
  await dateField(page, "YYYY-MM-DD", "DD/MM/YYYY");
  await edit(page, "Delivery");
  await page
    .getByLabel("Copy source for Delivery", { exact: true })
    .selectOption("date");
  await expect(page.getByLabel("Output type", { exact: true })).toHaveValue(
    "date",
  );
  await expect(
    page.getByLabel("Output date format", { exact: true }),
  ).toHaveValue("DD/MM/YYYY");
  await closeSettings(page);
  await expect(
    page.getByRole("button", { name: "Download converted CSV", exact: true }),
  ).toBeDisabled();
  await edit(page, "Delivery");
  await page.getByLabel("Remove leading and trailing whitespace").check();
  await closeSettings(page);
  expect((await download(page)).toString()).toBe("Delivery\r\n29/02/2024\r\n");
  await edit(page, "Delivery");
  await page.getByLabel("Use a fixed value", { exact: true }).check();
  await page.locator("details.column-validation summary").click();
  await page.getByLabel("Maximum characters", { exact: true }).fill("2");
  await page
    .getByLabel("Fixed value type", { exact: true })
    .selectOption("date");
  await page.getByLabel("Fixed date", { exact: true }).fill("10/08/2026");
  await page
    .getByLabel("Source date format", { exact: true })
    .selectOption("MM/DD/YYYY");
  await page
    .getByLabel("Output date format", { exact: true })
    .selectOption("YYYY-MM-DD");
  await closeSettings(page);
  expect((await download(page)).toString()).toBe("Delivery\r\n2026-10-08\r\n");
});
