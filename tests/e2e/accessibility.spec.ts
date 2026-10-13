import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { upload, add, map, preview } from "./helpers";
test("labelled keyboard controls, laptop/mobile layouts and automated accessibility", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await add(page, ["Reference"]);
  const select = page.getByLabel("Copy source for Reference", { exact: true });
  await select.focus();
  await select.press("ArrowDown");
  await select.press("Enter");
  await map(page, "Reference", "id");
  await preview(page);
  const button = page.getByRole("button", { name: "Download converted CSV" });
  await button.focus();
  await expect(button).toBeFocused();
  for (const width of [1366, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});
